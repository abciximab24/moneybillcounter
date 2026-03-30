import React from 'react';
import { ChevronLeft, Plus, Settings } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import ExpenseList from './ExpenseList';

export default function TripDetail({
  trip,
  expenses,
  exchangeRates,
  onBack,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onCheckBalances,
  onOpenSettings
}) {
  // Calculate total spending in base currency
  const totalSpending = expenses.reduce((sum, e) => {
    const rate = exchangeRates[e.currency] || 1;
    return sum + e.amount * rate;
  }, 0);

  return (
    <main>
      {/* Header Card */}
      <div className="p-4 bg-indigo-600 text-white m-4 rounded-[40px] shadow-xl">
        <div className="flex items-center gap-2 mb-6 p-2">
          <button
            onClick={onBack}
            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold flex-1 truncate">{trip.name}</h2>
          <button
            onClick={onOpenSettings}
            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <p className="text-[10px] font-black uppercase opacity-60">Group Spending</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">
              {formatCurrency(totalSpending, trip.baseCurrency)}
            </span>
          </div>
          <p className="text-xs opacity-60 mt-1">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} • {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white/10 p-4 flex justify-between items-center rounded-[28px]">
          <button
            onClick={onCheckBalances}
            className="w-full bg-white text-indigo-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
          >
            Check Balances
          </button>
        </div>
      </div>

      {/* Expense List */}
      <ExpenseList
        expenses={expenses}
        baseCurrency={trip.baseCurrency}
        exchangeRates={exchangeRates}
        onEdit={onEditExpense}
        onDelete={onDeleteExpense}
      />

      {/* Floating Add Button */}
      <div className="fixed bottom-8 left-0 right-0 px-6 max-w-md mx-auto z-40">
        <button
          onClick={onAddExpense}
          className="w-full bg-slate-900 text-white py-5 rounded-[32px] font-black uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors"
        >
          <Plus size={20} />
          Log Cost
        </button>
      </div>
    </main>
  );
}