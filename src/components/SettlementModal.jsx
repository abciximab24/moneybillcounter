import React from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export default function SettlementModal({ trip, expenses, exchangeRates, onClose }) {
  // Calculate balances
  const calculateBalances = () => {
    const balances = {};
    trip.members.forEach(m => balances[m.name] = 0);

    expenses.forEach(expense => {
      const rate = exchangeRates[expense.currency] || 1;
      const amountInBase = expense.amount * rate;
      const share = amountInBase / expense.splitWith.length;

      // Payer gets credit
      if (balances[expense.payer] !== undefined) {
        balances[expense.payer] += amountInBase;
      }

      // Everyone who splits owes their share
      expense.splitWith.forEach(name => {
        if (balances[name] !== undefined) {
          balances[name] -= share;
        }
      });
    });

    return balances;
  };

  // Calculate optimal settlements
  const calculateSettlements = () => {
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
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return settlements;
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();

  return (
    <div className="fixed inset-0 bg-white z-[60] p-8 overflow-y-auto">
      <button onClick={onClose} className="mb-8 p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">
        <X size={24} />
      </button>

      <h2 className="text-3xl font-black mb-8 italic">Settlements</h2>

      {/* Balances */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-500 mb-4">Individual Balances</h3>
        {Object.entries(balances).map(([name, balance]) => (
          <div key={name} className="flex justify-between items-center p-6 bg-slate-50 rounded-[32px] mb-4">
            <span className="font-bold">{name}</span>
            <span className={`font-black text-xl ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {balance >= 0 ? '+' : ''}{formatCurrency(balance, trip.baseCurrency)}
            </span>
          </div>
        ))}
      </div>

      {/* Settlements */}
      {settlements.length > 0 ? (
        <div>
          <h3 className="text-lg font-bold text-slate-500 mb-4">Who Pays Whom</h3>
          {settlements.map((s, idx) => (
            <div key={idx} className="flex items-center gap-4 p-6 bg-indigo-50 rounded-[32px] mb-4">
              <div className="flex-1">
                <p className="font-bold text-indigo-600">{s.from}</p>
                <p className="text-xs text-slate-500">pays</p>
                <p className="font-bold text-emerald-600">{s.to}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-2xl text-indigo-600">
                  {formatCurrency(s.amount, trip.baseCurrency)}
                </p>
              </div>
              <ArrowRightLeft size={24} className="text-indigo-400" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">All settled up! 🎉</p>
          <p className="text-slate-300 text-sm mt-1">No payments needed.</p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-8 p-6 bg-slate-100 rounded-[32px]">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Total Spending</p>
        <p className="text-3xl font-black">
          {formatCurrency(
            expenses.reduce((sum, e) => sum + e.amount * (exchangeRates[e.currency] || 1), 0),
            trip.baseCurrency
          )}
        </p>
      </div>
    </div>
  );
}