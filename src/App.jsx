import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, getDoc, getDocs, setDoc } from 'firebase/firestore';

// Components
import LoginPage from './components/LoginPage';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import AddExpenseModal from './components/AddExpenseModal';
import EditExpenseModal from './components/EditExpenseModal';
import SettlementModal from './components/SettlementModal';
import CreateTripModal from './components/CreateTripModal';
import JoinTripModal from './components/JoinTripModal';
import TripSettingsModal from './components/TripSettingsModal';
import BottomNav from './components/BottomNav';
import ProfilePage from './components/ProfilePage';
import { useToast } from './components/Toast';

// Utils
import { fetchExchangeRates } from './utils/currency';
import { assignEmojiToMember } from './utils/emojis';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyARVY1R4pdr7b8L6Wf3h_yHJQ6_kz6lofA",
  authDomain: "moneybillcounter.firebaseapp.com",
  projectId: "moneybillcounter",
  storageBucket: "moneybillcounter.firebasestorage.app",
  messagingSenderId: "298141152151",
  appId: "1:298141152151:web:c68f6c58f09ff74e708ad2",
  measurementId: "G-6NTV5XBHDT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { db };

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [view, setView] = useState('loading');

  // Data state
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({ HKD: 1, TWD: 0.24, JPY: 0.052 });

  // Modal state
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showJoinTrip, setShowJoinTrip] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState('home');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Toast
  const { showToast, ToastContainer } = useToast();

  // Fetch exchange rates on mount
  useEffect(() => {
    const loadRates = async () => {
      const rates = await fetchExchangeRates();
      setExchangeRates(rates);
    };
    loadRates();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          name: u.displayName,
          email: u.email,
          photo: u.photoURL
        });
        
        // Load user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Create default profile
            const defaultProfile = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || 'User',
              emoji: assignEmojiToMember({ name: u.displayName }, []),
              photoURL: u.photoURL,
              createdAt: Date.now()
            };
            await setDoc(doc(db, 'users', u.uid), defaultProfile);
            setUserProfile(defaultProfile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
        
        setView('home');
      } else {
        setUser(null);
        setUserProfile(null);
        setView('login');
      }
    });
    return unsubscribe;
  }, []);

  // Load trips for user
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'trips'),
      where('memberEmails', 'array-contains', user.email)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTrips = snapshot.docs.map(d => {
        const data = d.data();
        // Assign emojis to members who don't have them
        const existingEmojis = data.members?.filter(m => m.emoji).map(m => m.emoji) || [];
        const membersWithEmojis = data.members?.map(m => ({
          ...m,
          emoji: m.emoji || assignEmojiToMember(m, existingEmojis)
        })) || [];
        
        return { id: d.id, ...data, members: membersWithEmojis };
      });
      setTrips(loadedTrips);
    }, (error) => {
      console.error('Error loading trips:', error);
      showToast('Failed to load trips', 'error');
    });

    return unsubscribe;
  }, [user, showToast]);

  // Load expenses for active trip with fallback
  useEffect(() => {
    if (!activeTrip) return;

    let unsubscribe = null;
    let retryCount = 0;
    const maxRetries = 3;

    const loadExpensesWithFallback = async () => {
      const q = query(
        collection(db, 'expenses'),
        where('tripId', '==', activeTrip.id),
        orderBy('timestamp', 'desc')
      );

      // Try onSnapshot first
      try {
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const loadedExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setExpenses(loadedExpenses);
            retryCount = 0; // Reset retry count on success
          },
          async (error) => {
            console.error('onSnapshot error:', error);
            
            // Fallback to getDocs if onSnapshot fails
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying with getDocs (attempt ${retryCount}/${maxRetries})...`);
              
              try {
                const snapshot = await getDocs(q);
                const loadedExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setExpenses(loadedExpenses);
                showToast('Loaded expenses (real-time sync unavailable)', 'info');
              } catch (getDocsError) {
                console.error('getDocs fallback also failed:', getDocsError);
                showToast('Failed to load expenses. Please refresh.', 'error');
              }
            } else {
              showToast('Connection issues. Please refresh the page.', 'error');
            }
          }
        );
      } catch (error) {
        console.error('Error setting up expense listener:', error);
        
        // Direct fallback to getDocs
        try {
          const snapshot = await getDocs(q);
          const loadedExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setExpenses(loadedExpenses);
        } catch (getDocsError) {
          console.error('getDocs also failed:', getDocsError);
          showToast('Failed to load expenses', 'error');
        }
      }
    };

    loadExpensesWithFallback();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTrip, showToast]);

  // Handlers
  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
      showToast('Failed to sign in', 'error');
    }
  }, [showToast]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      setActiveTrip(null);
      setActiveTab('home');
      setView('home');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Failed to sign out', 'error');
    }
  }, [showToast]);

  const handleProfileUpdate = useCallback((profileData) => {
    setUserProfile(profileData);
  }, []);

  const handleCreateTrip = useCallback(async (tripData) => {
    setIsLoading(true);
    try {
      // Use user profile emoji if available
      const userEmoji = userProfile?.emoji || assignEmojiToMember({ name: user.name }, []);
      
      // Assign emojis to all members
      const membersWithEmojis = tripData.members.map(m => ({
        ...m,
        emoji: m.email === user.email ? userEmoji : (m.emoji || assignEmojiToMember(m, [userEmoji]))
      }));
      
      await addDoc(collection(db, 'trips'), {
        ...tripData,
        members: membersWithEmojis
      });
      showToast('Trip created!', 'success');
      setShowCreateTrip(false);
    } catch (error) {
      console.error('Create trip error:', error);
      showToast('Failed to create trip', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, userProfile, user]);

  const handleSaveExpense = useCallback(async (expenseData) => {
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'expenses'), expenseData);
      showToast('Expense logged!', 'success');
      setShowAddExpense(false);
    } catch (error) {
      console.error('Save expense error:', error);
      showToast('Failed to save expense', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const handleDeleteExpense = useCallback(async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
      showToast('Expense deleted', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete expense', 'error');
    }
  }, [showToast]);

  const handleEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    setShowEditExpense(true);
  }, []);

  const handleExpenseUpdated = useCallback(() => {
    setShowEditExpense(false);
    setEditingExpense(null);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      setActiveTrip(null);
      setView('home');
    }
  }, []);

  // Loading screen
  if (view === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center font-black animate-pulse bg-slate-50">
        <span className="text-2xl">Moneybillcounter...</span>
      </div>
    );
  }

  // Login screen
  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Main app
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white border-b sticky top-0 z-40">
        <h1
          className="text-xl font-black italic tracking-tighter cursor-pointer"
          onClick={() => {
            setActiveTrip(null);
            setActiveTab('home');
            setView('home');
          }}
        >
          Moneybillcounter
        </h1>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm flex items-center justify-center text-2xl bg-white"
        >
          {userProfile?.emoji || (user?.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : '👤')}
        </button>
      </header>

      {/* Views */}
      {view === 'home' && !activeTrip && activeTab === 'home' && (
        <TripList
          trips={trips}
          onSelectTrip={(trip) => {
            setActiveTrip(trip);
            setView('trip');
          }}
          onCreateTrip={() => setShowCreateTrip(true)}
          onJoinTrip={() => setShowJoinTrip(true)}
        />
      )}

      {view === 'home' && activeTab === 'profile' && (
        <ProfilePage
          user={user}
          userProfile={userProfile}
          onProfileUpdate={handleProfileUpdate}
          showToast={showToast}
        />
      )}

      {view === 'trip' && activeTrip && (
        <TripDetail
          trip={activeTrip}
          expenses={expenses}
          exchangeRates={exchangeRates}
          onBack={() => {
            setActiveTrip(null);
            setView('home');
            setActiveTab('home');
          }}
          onAddExpense={() => setShowAddExpense(true)}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onCheckBalances={() => setShowSettlement(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Modals */}
      {showCreateTrip && (
        <CreateTripModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowCreateTrip(false)}
          onCreate={handleCreateTrip}
          isLoading={isLoading}
        />
      )}

      {showJoinTrip && (
        <JoinTripModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowJoinTrip(false)}
          onJoined={() => setShowJoinTrip(false)}
          showToast={showToast}
        />
      )}

      {showAddExpense && activeTrip && (
        <AddExpenseModal
          trip={activeTrip}
          user={user}
          userProfile={userProfile}
          onClose={() => setShowAddExpense(false)}
          onSave={handleSaveExpense}
          isLoading={isLoading}
        />
      )}

      {showEditExpense && editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          trip={activeTrip}
          onClose={() => {
            setShowEditExpense(false);
            setEditingExpense(null);
          }}
          onUpdated={handleExpenseUpdated}
          showToast={showToast}
        />
      )}

      {showSettlement && activeTrip && (
        <SettlementModal
          trip={activeTrip}
          expenses={expenses}
          exchangeRates={exchangeRates}
          onClose={() => setShowSettlement(false)}
          showToast={showToast}
        />
      )}

      {showSettings && activeTrip && (
        <TripSettingsModal
          trip={activeTrip}
          user={user}
          userProfile={userProfile}
          onClose={() => setShowSettings(false)}
          onUpdated={() => setShowSettings(false)}
          showToast={showToast}
        />
      )}

      {/* Bottom Navigation - only show when not in trip detail */}
      {view !== 'trip' && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}