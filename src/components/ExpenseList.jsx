import React, { memo } from 'react';
import { Edit2, Trash2, Plane, Utensils, Landmark, ShoppingBag, Car, Home, MoreHorizontal } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

const CATEGORY_ICONS = {
  travel: Plane,
  food: Utensils,
  attraction: Landmark,
  shopping: ShoppingBag,
  transport: Car,
  accommodation: Home,
  other: MoreHorizontal
};

const ExpenseList = memo(function ExpenseList({ expenses, baseCurrency, exchangeRates, onEdit, onDelete, members = [] }) {
  const getCategoryIcon = (category) => {
    const Icon = CATEGORY_ICONS[category];
    return Icon ? <Icon size={16} /> : null;
  };

  const getMemberEmoji = (name) => {
    const member = members.find(m => m.name === name);
    return member?.emoji || '👤';
  };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <p className="text-slate-400 font-medium">No expenses yet</p>
        <p className="text-slate-300 text-sm mt-1">Add your first expense to start tracking!</p>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-3">
      {(expenses || []).filter(Boolean).map((expense) => {
        if (!expense || typeof expense !== 'object') return null;
        const convertedAmount = (expense.amount || 0) * (exchangeRates[expense?.currency] || 1);
        const categoryIcon = getCategoryIcon(expense.category);
        
        return (
          <div
            key={expense.id}
            className="bg-white p-4 rounded-3xl flex items-center gap-4 border border-slate-50 hover:border-slate-200 transition-colors"
          >
            {/* Category Icon */}
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              {categoryIcon || (
                <span className="text-lg font-bold">
                  {getCurrencySymbol(expense.currency)}
                </span>
              )}
            </div>
            
            {/* Expense Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{expense.desc}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{getMemberEmoji(expense.payer)}</span>
                <p className="text-[10px] text-slate-300 font-bold uppercase">
                  {expense.payer}
                  {Array.isArray(expense.splitWith) && expense.splitWith.length > 0 && (
                    <span className="ml-1">
                      • Split {expense.splitMode === 'all' ? 'all' : expense.splitMode === 'exclude' ? 'all-' + (members.length - expense.splitWith.length) : expense.splitWith.length}
                    </span>
                  )}
                </p>
              </div>
              
              {/* Split members preview */}
              {Array.isArray(expense.splitWith) && expense.splitWith.length > 0 && expense.splitWith.length < members.length && (
                <div className="flex gap-1 mt-2">
                  {expense.splitWith.slice(0, 4).map((name, idx) => (
                    <span key={idx} className="text-sm">{getMemberEmoji(name)}</span>
                  ))}
                  {expense.splitWith.length > 4 && (
                    <span className="text-xs text-slate-400">+{expense.splitWith.length - 4}</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Amount */}
            <div className="text-right">
              <p className="font-black text-sm">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              {expense.currency !== baseCurrency && (
                <p className="text-[10px] font-bold text-indigo-400">
                  ≈ {formatCurrency(convertedAmount, baseCurrency)}
                </p>
              )}
            </div>
            
            {/* Actions */}
            {onEdit && onDelete && (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(expense)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="Edit expense"
                >
                  <Edit2 size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="p-2 hover:bg-rose-50 rounded-xl transition-colors"
                  aria-label="Delete expense"
                >
                  <Trash2 size={16} className="text-rose-400" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default ExpenseList;
