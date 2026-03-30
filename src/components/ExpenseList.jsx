import React from 'react';
import { Edit2, Trash2, Plane, Utensils, Landmark, ShoppingBag, Car, Home } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

const CATEGORY_ICONS = {
  travel: Plane,
  food: Utensils,
  attraction: Landmark,
  shopping: ShoppingBag,
  transport: Car,
  accommodation: Home,
  other: null
};

export default function ExpenseList({ expenses, baseCurrency, exchangeRates, onEdit, onDelete }) {
  const getCategoryIcon = (category) => {
    const Icon = CATEGORY_ICONS[category];
    return Icon ? <Icon size={16} /> : null;
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <p className="text-slate-400 font-medium">No expenses yet</p>
        <p className="text-slate-300 text-sm mt-1">Add your first expense to start tracking!</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {expenses.map((expense) => {
        const convertedAmount = expense.amount * (exchangeRates[expense.currency] || 1);
        
        return (
          <div
            key={expense.id}
            className="bg-white p-4 rounded-3xl flex items-center gap-4 border border-slate-50 hover:border-slate-200 transition-colors"
          >
            {expense.category && (
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                {getCategoryIcon(expense.category) || (
                  <span className="text-lg font-bold">
                    {getCurrencySymbol(expense.currency)}
                  </span>
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{expense.desc}</p>
              <p className="text-[10px] text-slate-300 font-bold uppercase">
                By {expense.payer}
                {expense.splitWith && expense.splitWith.length > 0 && (
                  <span className="ml-1">
                    • Split with {expense.splitWith.length} {expense.splitWith.length === 1 ? 'person' : 'people'}
                  </span>
                )}
              </p>
            </div>
            
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
            
            {onEdit && onDelete && (
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(expense)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Edit2 size={16} className="text-slate-400" />
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="p-2 hover:bg-rose-50 rounded-xl transition-colors"
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
}