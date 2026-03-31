import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../App';

export default function EditExpenseModal({ expense, trip, onClose, onUpdated, showToast }) {
  const [desc, setDesc] = useState(expense.desc);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [currency, setCurrency] = useState(expense.currency);
  const [payer, setPayer] = useState(expense.payer);
  const [splitMode, setSplitMode] = useState(expense.splitMode || 'all');
  const [selectedMembers, setSelectedMembers] = useState(expense.splitWith || trip.members.map(m => m.name));
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    const numAmount = parseFloat(amount);
    if (!desc.trim() || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter valid description and amount', 'error');
      return;
    }

    let splitWith = selectedMembers;
    if (splitMode === 'all') {
      splitWith = trip.members.map(m => m.name);
    }

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'expenses', expense.id), {
        desc: desc.trim(),
        amount: numAmount,
        currency,
        payer,
        splitWith,
        splitMode,
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

  const toggleMember = (name) => {
    setSelectedMembers(prev => 
      prev.includes(name) 
        ? prev.filter(m => m !== name)
        : [...prev, name]
    );
  };

  const getSplitPreview = () => {
    const numAmount = parseFloat(amount) || 0;
    let splitWith = selectedMembers;
    if (splitMode === 'all') {
      splitWith = trip.members.map(m => m.name);
    }
    
    if (splitWith.length === 0 || numAmount <= 0) return null;
    
    const perPerson = numAmount / splitWith.length;
    return {
      members: splitWith,
      perPerson
    };
  };

  const splitPreview = getSplitPreview();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
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

        <div className="flex gap-3 mb-4">
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

        {/* Payer Selection */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Who Paid?</p>
          <select
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none"
          >
            {trip.members.map(member => (
              <option key={member.name} value={member.name}>
                {member.emoji || '👤'} {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Split Mode */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Split With</p>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSplitMode('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                splitMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSplitMode('specific')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                splitMode === 'specific' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Specific
            </button>
            <button
              onClick={() => setSplitMode('exclude')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                splitMode === 'exclude' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Exclude
            </button>
          </div>

          {splitMode !== 'all' && (
            <div className="flex flex-wrap gap-2">
              {trip.members.map(member => (
                <button
                  key={member.name}
                  onClick={() => toggleMember(member.name)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    (splitMode === 'specific' && selectedMembers.includes(member.name)) ||
                    (splitMode === 'exclude' && !selectedMembers.includes(member.name))
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {member.emoji || '👤'} {member.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split Preview */}
        {splitPreview && (
          <div className="bg-slate-50 p-4 rounded-2xl mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Split Preview</p>
            <p className="font-bold text-lg">
              {splitPreview.perPerson.toFixed(2)} {currency} each
            </p>
            <p className="text-sm text-slate-500">
              Split between {splitPreview.members.join(', ')}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isLoading || !desc.trim() || !amount || parseFloat(amount) <= 0}
            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}