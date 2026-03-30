import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';

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
import { useToast } from './components/Toast';

// Utils
import { fetchExchangeRates } from './utils/currency';

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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          name: u.displayName,
          email: u.email,
          photo: u.photoURL
        });
        setView('home');
      } else {
        setUser(null);
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
      setTrips(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error('Error loading trips:', error);
      showToast('Failed to load trips', 'error');
    });

    return unsubscribe;
  }, [user, showToast]);

  // Load expenses for active trip
  useEffect(() => {
    if (!activeTrip) return;
    
    const q = query(
      collection(db, 'expenses'),
      where('tripId', '==', activeTrip.id),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error('Error loading expenses:', error);
      showToast('Failed to load expenses', 'error');
    });

    return unsubscribe;
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
      setView('home');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Failed to sign out', 'error');
    }
  }, [showToast]);

  const handleCreateTrip = useCallback(async (tripData) => {
    setIsLoading(true);
    try {
      await addDoc(collection(db, 'trips'), tripData);
      showToast('Trip created!', 'success');
      setShowCreateTrip(false);
    } catch (error) {
      console.error('Create trip error:', error);
      showToast('Failed to create trip', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white border-b sticky top-0 z-40">
        <h1
          className="text-xl font-black italic tracking-tighter cursor-pointer"
          onClick={() => {
            setActiveTrip(null);
            setView('home');
          }}
        >
          Moneybillcounter
        </h1>
        <button
          onClick={handleLogout}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm"
        >
          {user?.photo && <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />}
        </button>
      </header>

      {/* Views */}
      {view === 'home' && !activeTrip && (
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

      {view === 'trip' && activeTrip && (
        <TripDetail
          trip={activeTrip}
          expenses={expenses}
          exchangeRates={exchangeRates}
          onBack={() => {
            setActiveTrip(null);
            setView('home');
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
          onClose={() => setShowCreateTrip(false)}
          onCreate={handleCreateTrip}
          isLoading={isLoading}
        />
      )}

      {showJoinTrip && (
        <JoinTripModal
          user={user}
          onClose={() => setShowJoinTrip(false)}
          onJoined={() => setShowJoinTrip(false)}
          showToast={showToast}
        />
      )}

      {showAddExpense && activeTrip && (
        <AddExpenseModal
          trip={activeTrip}
          user={user}
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
        />
      )}

      {showSettings && activeTrip && (
        <TripSettingsModal
          trip={activeTrip}
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdated={() => setShowSettings(false)}
          showToast={showToast}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}