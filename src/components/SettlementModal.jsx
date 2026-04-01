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
        settlementKey: `${d.data().from}-${d.data().to}`
      }));
      setSettledDebts(loaded);
    }, (error) => {
      console.error('Error loading settlements:', error);
    });

    return unsubscribe;
  }, [trip.id]);

  // Calculate balances using name-to-email resolution
  // If name changed since expense was created, memberEmails snapshot resolves the original name
  const calculateBalances = useCallback(() => {
    const balances = {};
    if (!trip.members || !Array.isArray(trip.members)) return balances;
    // Initialize balances keyed by current name (for display)
    trip.members.forEach(m => { balances[m.name] = 0; });

    if (!expenses || !Array.isArray(expenses)) return balances;
    expenses.forEach(expense => {
      if (!expense || typeof expense !== 'object') return;
      if (!expense.splitWith || !Array.isArray(expense.splitWith) || expense.splitWith.length === 0) return;
      
      const rate = exchangeRates[expense.currency] || 1;
      const amountInBase = expense.amount * rate;
      const share = amountInBase / expense.splitWith.length;

      // memberEmails is the snapshot of name->email at expense creation time
      const memberEmails = expense.memberEmails || {};
      
      // Resolve payer email from snapshot, then find current name for that email
      let payerEmail = memberEmails[expense.payer];
      if (!payerEmail) {
        const currentMember = trip.members.find(m => m.name === expense.payer);
        payerEmail = currentMember?.email;
      }
      // Find the current name for this email
      const payerMember = trip.members.find(m => m.email === payerEmail);
      const currentPayerName = payerMember?.name;
      if (currentPayerName && balances[currentPayerName] !== undefined) {
        balances[currentPayerName] += amountInBase;
      }

      // Resolve split participants by email, then find current name
      expense.splitWith.forEach(name => {
        let email = memberEmails[name];
        if (!email) {
          const currentMember = trip.members.find(m => m.name === name);
          email = currentMember?.email;
        }
        const splitMember = trip.members.find(m => m.email === email);
        const currentName = splitMember?.name;
        if (currentName && balances[currentName] !== undefined) {
          balances[currentName] -= share;
        }
      });
    });

    return balances;
  }, [trip.members, expenses, exchangeRates]);

  // Calculate optimal settlements with unique keys
  const calculateSettlements = useCallback(() => {
    const balances = calculateBalances();
    const settlements = [];

    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([name, balance]) => {
      if (balance < -0.01) {
        debtors.push({ name, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ name, amount: balance });
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
        const settlementKey = `${debtor.name}-${creditor.name}`;
        const existingSettlement = settledDebts.find(s => s.settlementKey === settlementKey);
        
        settlements.push({
          key: `${debtor.name}-${creditor.name}-${Date.now()}`, // Unique key for React rendering
          settlementKey,
          from: debtor.name,
          to: creditor.name,
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
      // Undo settlement
      await handleUndoSettlement(settlement);
    } else {
      // Mark as settled
      await handleMarkSettled(settlement);
    }
  };

  const handleMarkSettled = async (settlement) => {
    setIsLoading(true);
    try {
      const settlementData = {
        tripId: trip.id,
        from: settlement.from,
        to: settlement.to,
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

  // Memoized member emoji lookup - moved before regular function calls (hooks must be called first)
  const getMemberEmoji = useCallback((name) => {
    return trip.members.find(m => m.name === name)?.emoji || '👤';
  }, [trip.members]);

  const balances = calculateBalances();
  const settlements = calculateSettlements();

  // Filter settlements
  const filteredSettlements = filterMember === 'all' 
    ? settlements 
    : settlements.filter(s => s.from === filterMember || s.to === filterMember);

  // Get unique members for filter
  const memberNames = trip.members.map(m => m.name);

  // Count settled
  const settledCount = settledDebts.length;
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
        {Object.entries(balances).map(([name, balance]) => (
          <div key={name} className="flex justify-between items-center p-6 bg-slate-50 rounded-[32px] mb-4">
            <span className="font-bold flex items-center gap-2">
              {getMemberEmoji(name)} {name}
            </span>
            <span className={`font-black text-xl ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance, trip.baseCurrency)}
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
                  {getMemberEmoji(s.from)} {s.from}
                </p>
                <p className="text-xs text-slate-500">pays</p>
                <p className={`font-bold ${s.isSettled ? 'text-emerald-600' : 'text-emerald-600'}`}>
                  {getMemberEmoji(s.to)} {s.to}
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