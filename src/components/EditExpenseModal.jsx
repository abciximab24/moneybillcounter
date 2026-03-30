import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../App';

export default function EditExpenseModal({ expense, trip, onClose, onUpdated, showToast }) {
  const [desc, setDesc] = useState(expense.desc);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [currency, setCurrency] = useState(expense.currency);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    const numAmount = parseFloat(amount);
    if (!desc.trim() || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter valid description and amount', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'expenses', expense.id), {
        desc: desc.trim(),
        amount: numAmount,
        currency,
        updatedAt: Date.now()
      });
      showToast('Expense updated', 'success');
      onUpdated();
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update expense', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'expenses', expense.id));
      showToast('Expense deleted', 'success');
      onUpdated();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete expense', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic">Edit Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
          className="w-full p-4 bg-slate-100 rounded-2xl mb-4 font-bold outline-none"
        />

        <div className="flex gap-3 mb-6">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold outline-none"
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="p-4 bg-slate-100 rounded-2xl font-bold outline-none"
          >
            {Object.keys(CURRENCIES).map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 bg-rose-100 text-rose-600 py-4 rounded-2xl font-black uppercase disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={handleUpdate}
            disabled={isLoading}
            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}