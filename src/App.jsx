import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, getDoc, getDocs, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

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

  // Load trips for user using getDocs (avoids Firestore Listen connection issues)
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadTrips = async () => {
      try {
        const q = query(
          collection(db, 'trips'),
          where('memberEmails', 'array-contains', user.email)
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          const loadedTrips = snapshot.docs.map(d => {
            const data = d.data();
            const existingEmojis = data.members?.filter(m => m.emoji).map(m => m.emoji) || [];
            const membersWithEmojis = data.members?.map(m => ({
              ...m,
              emoji: m.emoji || assignEmojiToMember(m, existingEmojis)
            })) || [];
            
            return { id: d.id, ...data, members: membersWithEmojis };
          });
          setTrips(loadedTrips);
        }
      } catch (error) {
        console.error('Error loading trips:', error);
        if (isMounted) {
          showToast('Failed to load trips', 'error');
        }
      }
    };

    loadTrips();

    // Refresh every 15 seconds
    const intervalId = setInterval(loadTrips, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user, showToast]);

  // Load expenses for active trip using getDocs (more reliable than onSnapshot with connection issues)
  useEffect(() => {
    if (!activeTrip) return;

    let isMounted = true;
    const isValidExpense = (e) => e && typeof e === 'object' && typeof e.id === 'string';

    const loadExpenses = async () => {
      try {
        // Use getDocs as primary method (avoids Firestore Listen connection issues)
        const q = query(
          collection(db, 'expenses'),
          where('tripId', '==', activeTrip.id),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          const loadedExpenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          console.log(`Loaded ${loadedExpenses.length} expenses for trip ${activeTrip.id}`);
          setExpenses(loadedExpenses);
        }
      } catch (error) {
        console.error('Error loading expenses:', error);
        if (isMounted) {
          showToast('Failed to load expenses. Please refresh.', 'error');
        }
      }
    };

    loadExpenses();

    // Also set up a periodic refresh to catch new expenses
    const intervalId = setInterval(loadExpenses, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
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

  const handleProfileUpdate = useCallback(async (profileData) => {
    setUserProfile(profileData);
    
    // Update the user's name and emoji in all trips they belong to
    try {
      const tripsQuery = query(
        collection(db, 'trips'),
        where('memberEmails', 'array-contains', user.email)
      );
      const tripsSnapshot = await getDocs(tripsQuery);
      
      for (const tripDoc of tripsSnapshot.docs) {
        const tripData = tripDoc.data();
        const updatedMembers = (tripData.members || []).map(m => 
          m.email === user.email 
            ? { ...m, name: profileData.displayName, emoji: profileData.emoji }
            : m
        );
        
        await updateDoc(doc(db, 'trips', tripDoc.id), { members: updatedMembers });
      }
      
      console.log(`Updated profile in ${tripsSnapshot.docs.length} trips`);
    } catch (error) {
      console.error('Error syncing profile to trips:', error);
    }
  }, [user?.email]);

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
      if (!activeTrip?.members) return;
      
      // Build email-to-member mapping for reliable lookup
      const emailToMember = {};
      activeTrip.members.forEach(m => {
        if (m.email) emailToMember[m.email] = m;
      });
      
      // Build memberEmails from resolved trip member names
      const memberEmails = {};
      activeTrip.members.forEach(m => {
        if (m.name && m.email) memberEmails[m.name] = m.email;
      });
      
      // Resolve payer: use the name from the form (selected payer), resolve to current trip member name
      let payerName = expenseData.payer;
      const payerByEmail = emailToMember[user?.email];
      // If form's payer matches a known trip member, use the current trip member's name
      const matchedPayer = activeTrip.members.find(m => m.name === payerName);
      if (matchedPayer) {
        payerName = matchedPayer.name; // Use current name from trip
      }
      
      // Resolve splitWith members: find each by name in current trip members, use correct names
      const resolvedSplitWith = (expenseData.splitWith || []).map(name => {
        const member = activeTrip.members.find(m => m.name === name);
        return member ? member.name : name;
      });

      // Get payer's email based on resolved payer NAME (not based on who is logged in!)
      const payerEmail = memberEmails[payerName] || (payerByEmail?.email);
      const splitWithEmails = resolvedSplitWith.map(name => memberEmails[name]);
      
      await addDoc(collection(db, 'expenses'), {
        ...expenseData,
        payer: payerName,
        splitWith: resolvedSplitWith,
        memberEmails,
        payerEmail,
        splitWithEmails
      });
      showToast('Expense logged!', 'success');
      setShowAddExpense(false);
    } catch (error) {
      console.error('Save expense error:', error);
      showToast('Failed to save expense', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, activeTrip, user]);

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
        <div
          onClick={() => { setActiveTab('profile'); setView('home'); setActiveTrip(null); }}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm flex items-center justify-center text-2xl bg-white cursor-pointer hover:scale-105 transition-transform"
        >
          {userProfile?.emoji || (user?.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" /> : '👤')}
        </div>
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