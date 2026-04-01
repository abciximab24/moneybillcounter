import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRightLeft, Check, Filter, Undo2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../App';

export default function SettlementModal({ trip, expenses, exchangeRates, onClose, showToast }) {
  const [settledDebts, setSettledDebts] = useState([]);
  const [filterMember, setFilterMember] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Load existing settlements from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'settlements'),
      where('tripId', '==', trip.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        settlementKey: `${d.data().fromEmail || ''}-${d.data().toEmail || ''}`
      }));
      setSettledDebts(loaded);
    }, (error) => {
      console.error('Error loading settlements:', error);
    });

    return unsubscribe;
  }, [trip.id]);

  // Calculate balances using EMAIL as dictionary keys - only convert to name for UI
  const calculateBalances = useCallback(() => {
    const balances = {}; // Keyed by EMAIL
    if (!trip.members || !Array.isArray(trip.members)) return balances;
    
    // Initialize balances keyed by email (immutable identity)
    trip.members.forEach(m => { 
      if (m.email) balances[m.email] = { email: m.email, amount: 0 }; 
    });

    if (!expenses || !Array.isArray(expenses)) return balances;
    expenses.forEach(expense => {
      if (!expense || typeof expense !== 'object') return;
      
      // Skip expenses with no split members
      const splitList = expense.splitWith || [];
      if (!Array.isArray(splitList) || splitList.length === 0) return;
      
      const rate = exchangeRates[expense.currency] || 1;
      const amountInBase = expense.amount * rate;
      const share = amountInBase / splitList.length;

      // Resolution order: 1) explicit email fields (newest) 2) memberEmails mapping (old) 3) name fallback
      const memberEmails = expense.memberEmails || {};
      
      // Use explicit payerEmail if available (new expenses), otherwise resolve via mapping or name
      let payerEmail = expense.payerEmail;
      if (!payerEmail) {
        payerEmail = memberEmails[expense.payer];
      }
      if (!payerEmail) {
        const currentMember = trip.members.find(m => m.name === expense.payer);
        payerEmail = currentMember?.email;
      }
      
      if (payerEmail && balances[payerEmail]) {
        balances[payerEmail].amount += amountInBase;
      }

      // Resolve split participants: use explicit splitWithEmails if available, otherwise map names
      if (expense.splitWithEmails && Array.isArray(expense.splitWithEmails)) {
        expense.splitWithEmails.forEach(email => {
          if (email && balances[email]) {
            balances[email].amount -= share;
          }
        });
      } else {
        // Fallback: resolve via memberEmails mapping or name
        splitList.forEach(name => {
          let email = memberEmails[name];
          if (!email) {
            const currentMember = trip.members.find(m => m.name === name);
            email = currentMember?.email;
          }
          if (email && balances[email]) {
            balances[email].amount -= share;
          }
        });
      }
    });

    return balances;
  }, [trip.members, expenses, exchangeRates]);

  // Helper: get current name for email
  const getNameForEmail = useCallback((email) => {
    const member = trip.members.find(m => m.email === email);
    return member?.name || email;
  }, [trip.members]);

  // Helper: get emoji for email
  const getEmojiForEmail = useCallback((email) => {
    const member = trip.members.find(m => m.email === email);
    return member?.emoji || '👤';
  }, [trip.members]);

  // Calculate settlements using EMAIL
  const calculateSettlements = useCallback(() => {
    const emailBalances = calculateBalances();
    const settlements = [];

    const debtors = [];
    const creditors = [];

    Object.values(emailBalances).forEach(({ email, amount }) => {
      if (amount < -0.01) {
        debtors.push({ email, amount: Math.abs(amount) });
      } else if (amount > 0.01) {
        creditors.push({ email, amount });
      }
    });

    // Sort by amount (largest first)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Match debtors with creditors
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.01) {
        const settlementKey = `${debtor.email}-${creditor.email}`;
        const existingSettlement = settledDebts.find(s => s.settlementKey === settlementKey);
        
        settlements.push({
          key: `${debtor.email}-${creditor.email}-${Date.now()}`,
          settlementKey,
          fromEmail: debtor.email,
          toEmail: creditor.email,
          amount,
          isSettled: !!existingSettlement,
          firestoreId: existingSettlement?.id
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return settlements;
  }, [calculateBalances, settledDebts]);

  const handleSettleIndividual = async (settlement) => {
    if (settlement.isSettled) {
      await handleUndoSettlement(settlement);
    } else {
      await handleMarkSettled(settlement);
    }
  };

  const handleMarkSettled = async (settlement) => {
    setIsLoading(true);
    try {
      const settlementData = {
        tripId: trip.id,
        fromEmail: settlement.fromEmail,
        toEmail: settlement.toEmail,
        amount: settlement.amount,
        currency: trip.baseCurrency,
        settledAt: Date.now()
      };

      await addDoc(collection(db, 'settlements'), settlementData);
      showToast(`Marked ${formatCurrency(settlement.amount, trip.baseCurrency)} as settled!`, 'success');
    } catch (error) {
      console.error('Settlement error:', error);
      showToast('Failed to mark as settled', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndoSettlement = async (settlement) => {
    if (!settlement.firestoreId) {
      showToast('Cannot undo - settlement not found', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'settlements', settlement.firestoreId));
      showToast('Settlement undone!', 'success');
    } catch (error) {
      console.error('Undo error:', error);
      showToast('Failed to undo settlement', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();

  // Filter by member email
  const filterEmail = trip.members.find(m => m.name === filterMember)?.email || 'all';
  const filteredSettlements = filterEmail === 'all' 
    ? settlements 
    : settlements.filter(s => s.fromEmail === filterEmail || s.toEmail === filterEmail);

  // Get unique members for filter
  const memberNames = trip.members.map(m => m.name);

  // Count settled
  const settledCount = settlements.filter(s => s.isSettled).length;
  const totalCount = settlements.length;

  return (
    <div className="fixed inset-0 bg-white z-[60] p-8 overflow-y-auto">
      <button onClick={onClose} className="mb-8 p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">
        <X size={24} />
      </button>

      <h2 className="text-3xl font-black mb-8 italic">Settlements</h2>

      {/* Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-slate-400" />
          <p className="text-xs font-bold text-slate-400 uppercase">Filter by Member</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterMember('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterMember === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All
          </button>
          {memberNames.map(name => (
            <button
              key={name}
              onClick={() => setFilterMember(name)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterMember === name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {trip.members.find(m => m.name === name)?.emoji || '👤'} {name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Balances */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-500 mb-4">Individual Balances</h3>
        {Object.values(balances).map(({ email, amount }) => (
          <div key={email} className="flex justify-between items-center p-6 bg-slate-50 rounded-[32px] mb-4">
            <span className="font-bold flex items-center gap-2">
              {getEmojiForEmail(email)} {getNameForEmail(email)}
            </span>
            <span className={`font-black text-xl ${amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {amount >= 0 ? '+' : ''}{formatCurrency(amount, trip.baseCurrency)}
            </span>
          </div>
        ))}
      </div>

      {/* Settlements */}
      {filteredSettlements.length > 0 ? (
        <div>
          <h3 className="text-lg font-bold text-slate-500 mb-4">Who Pays Whom</h3>
          {filteredSettlements.map((s) => (
            <div 
              key={s.key} 
              className={`flex items-center gap-4 p-6 rounded-[32px] mb-4 transition-all ${
                s.isSettled ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-indigo-50'
              }`}
            >
              <div className="flex-1">
                <p className={`font-bold ${s.isSettled ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {getEmojiForEmail(s.fromEmail)} {getNameForEmail(s.fromEmail)}
                </p>
                <p className="text-xs text-slate-500">pays</p>
                <p className={`font-bold ${s.isSettled ? 'text-emerald-600' : 'text-emerald-600'}`}>
                  {getEmojiForEmail(s.toEmail)} {getNameForEmail(s.toEmail)}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-black text-2xl ${s.isSettled ? 'text-emerald-500' : 'text-indigo-600'}`}>
                  {formatCurrency(s.amount, trip.baseCurrency)}
                </p>
                {s.isSettled && (
                  <p className="text-xs text-emerald-500 font-bold mt-1">✓ Settled</p>
                )}
              </div>
              <button
                onClick={() => handleSettleIndividual(s)}
                disabled={isLoading}
                className={`p-3 rounded-2xl transition-colors ${
                  s.isSettled 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                } disabled:opacity-50`}
                aria-label={s.isSettled ? 'Undo settlement' : 'Mark as settled'}
                title={s.isSettled ? 'Undo settlement' : 'Mark as settled'}
              >
                {s.isSettled ? <Undo2 size={20} /> : <Check size={20} />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">
            {filterMember === 'all' ? 'All settled up! 🎉' : 'No settlements for this member'}
          </p>
          <p className="text-slate-300 text-sm mt-1">
            {filterMember === 'all' ? 'No payments needed.' : 'Try selecting a different member'}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-8 p-6 bg-slate-100 rounded-[32px]">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Total Spending</p>
        <p className="text-3xl font-black">
          {formatCurrency(
            (expenses || []).filter(Boolean).reduce((sum, e) => sum + (e?.amount || 0) * (exchangeRates[e?.currency] || 1), 0),
            trip.baseCurrency
          )}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {settledCount} of {totalCount} debts settled
        </p>
        {totalCount > 0 && (
          <div className="mt-3 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(settledCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}