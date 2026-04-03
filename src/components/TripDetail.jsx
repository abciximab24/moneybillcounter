import React, { useState } from 'react';
import { ChevronLeft, Plus, Settings, Filter, Download } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { exportExpensesToCSV } from '../utils/export';
import ExpenseList from './ExpenseList';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
  { id: 'accommodation', label: 'Stay' },
  { id: 'attraction', label: 'Sights' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'travel', label: 'Travel' },
  { id: 'other', label: 'Other' }
];

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
  const [filterMember, setFilterMember] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter expenses with null safety
  const filteredExpenses = (expenses || []).filter(expense => {
    if (!expense || typeof expense !== 'object') return false;
    const matchesMember = filterMember === 'all' || 
      expense.payer === filterMember || 
      (Array.isArray(expense.splitWith) && expense.splitWith.includes(filterMember));
    
    const matchesCategory = filterCategory === 'all' || 
      expense.category === filterCategory;
    
    return matchesMember && matchesCategory;
  });

  // Calculate total spending in base currency
  const totalSpending = filteredExpenses.reduce((sum, e) => {
    const rate = exchangeRates[e?.currency] || 1;
    return sum + (e?.amount || 0) * rate;
  }, 0);

  // Get unique members for filter
  const memberNames = trip.members.map(m => m.name);

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
           <button
             onClick={() => exportExpensesToCSV(expenses, trip, exchangeRates)}
             className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
           >
             <Download size={20} />
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
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} • {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white/10 p-4 flex gap-3 items-center rounded-[28px]">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl transition-colors ${showFilters ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <Filter size={18} />
          </button>
          <button
            onClick={onCheckBalances}
            className="flex-1 bg-white text-indigo-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
          >
            Check Balances
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 mb-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            {/* Member Filter */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Filter by Member</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterMember('all')}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    filterMember === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All
                </button>
                {memberNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setFilterMember(name)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      filterMember === name ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {trip.members.find(m => m.name === name)?.emoji || '👤'} {name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Filter by Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      filterCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense List */}
      <ExpenseList
        expenses={filteredExpenses}
        baseCurrency={trip.baseCurrency}
        exchangeRates={exchangeRates}
        onEdit={onEditExpense}
        onDelete={onDeleteExpense}
        members={trip.members}
      />

      {/* Floating Add Button */}
      <div className="fixed bottom-20 left-0 right-0 px-6 max-w-md mx-auto z-40">
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