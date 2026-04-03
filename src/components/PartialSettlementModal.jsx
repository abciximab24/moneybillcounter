import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

export default function PartialSettlementModal({ 
  settlement, 
  remainingAmount, 
  baseCurrency, 
  onConfirm, 
  onClose,
  isLoading 
}) {
  const [amount, setAmount] = useState(remainingAmount.toFixed(2));

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    if (parsedAmount > remainingAmount) {
      return;
    }
    onConfirm(parsedAmount);
  };

  const handleQuickAmount = (pct) => {
    const quickAmount = (remainingAmount * pct).toFixed(2);
    setAmount(quickAmount);
  };

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= remainingAmount;
  const isFullPayment = isValid && Math.abs(parsedAmount - remainingAmount) < 0.01;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center" onClick={handleBackdropClick}>
      <div className="bg-white w-full max-w-md rounded-t-[32px] p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black italic">Settle Up</h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
          <p className="text-sm text-slate-500 mb-1">Amount owed</p>
          <p className="text-3xl font-black text-indigo-600">
            {formatCurrency(remainingAmount, baseCurrency)}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm font-bold text-slate-500 mb-2 block">
              How much are you paying?
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 text-2xl font-black border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:outline-none transition-colors"
              placeholder="0.00"
              autoFocus
            />
            {!isValid && amount && (
              <p className="text-rose-500 text-sm mt-2 font-medium">
                Please enter a valid amount (max {formatCurrency(remainingAmount, baseCurrency)})
              </p>
            )}
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleQuickAmount(0.25)}
              className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.5)}
              className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => handleQuickAmount(0.75)}
              className="flex-1 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setAmount(remainingAmount.toFixed(2))}
              className="flex-1 py-3 bg-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-200 transition-colors"
            >
              Full
            </button>
          </div>

          {isValid && !isFullPayment && (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-sm text-amber-700">
                <span className="font-bold">Partial payment:</span> You'll still owe{' '}
                <span className="font-black">
                  {formatCurrency(remainingAmount - parsedAmount, baseCurrency)}
                </span>{' '}
                after this payment.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full py-4 rounded-2xl font-black text-lg text-white transition-colors disabled:opacity-50 ${
              isFullPayment 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading ? 'Processing...' : isFullPayment ? 'Mark as Fully Settled' : 'Confirm Partial Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}