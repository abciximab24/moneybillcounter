import React, { useState, useMemo } from 'react';
import { X, Sparkles, Plane, Utensils, Landmark, ShoppingBag, Car, Home, MoreHorizontal } from 'lucide-react';
import { CURRENCIES, parseCurrencyFromText } from '../utils/currency';

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'transport', label: 'Transport', icon: Car },
  { id: 'accommodation', label: 'Stay', icon: Home },
  { id: 'attraction', label: 'Sights', icon: Landmark },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'other', label: 'Other', icon: MoreHorizontal }
];

export default function AddExpenseModal({ trip, user, onClose, onSave, isLoading }) {
  const [nlInput, setNlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [selectedCurrency, setSelectedCurrency] = useState(trip.baseCurrency);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(trip.members.map(m => m.name));
  const [useMagicMode, setUseMagicMode] = useState(true);

  // Parse natural language input
  const parsedExpense = useMemo(() => {
    if (!nlInput.trim()) return null;
    
    // Extract amount
    const amountMatch = nlInput.match(/(\d+(\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
    
    // Extract currency
    const currency = parseCurrencyFromText(nlInput) || trip.baseCurrency;
    
    // Extract members mentioned
    const mentionedMembers = trip.members.filter(m => 
      new RegExp(m.name.split(' ')[0], 'i').test(nlInput)
    ).map(m => m.name);
    
    // Clean description
    const desc = nlInput
      .replace(/\d+(\.\d+)?/g, '')
      .replace(/(jpy|twd|hkd|yen|for|with|split|nt|hk\$|¥|NT\$)/gi, '')
      .replace(trip.members.map(m => m.name.split(' ')[0]).join('|'), 'gi', '')
      .trim() || 'Expense';
    
    return {
      desc,
      amount,
      currency,
      splitWith: mentionedMembers.length > 0 ? mentionedMembers : trip.members.map(m => m.name)
    };
  }, [nlInput, trip]);

  // Manual mode validation
  const manualExpense = useMemo(() => {
    if (useMagicMode) return null;
    
    const amount = parseFloat(manualAmount) || 0;
    if (amount <= 0 || !manualDesc.trim()) return null;
    
    return {
      desc: manualDesc.trim(),
      amount,
      currency: selectedCurrency,
      splitWith: selectedMembers
    };
  }, [useMagicMode, manualAmount, manualDesc, selectedCurrency, selectedMembers]);

  const expenseToSave = useMagicMode ? parsedExpense : manualExpense;

  const handleSave = () => {
    if (!expenseToSave || expenseToSave.amount <= 0) return;
    
    onSave({
      ...expenseToSave,
      payer: user.name,
      category: selectedCategory,
      tripId: trip.id,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  };

  const toggleMember = (name) => {
    setSelectedMembers(prev => 
      prev.includes(name) 
        ? prev.filter(m => m !== name)
        : [...prev, name]
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black italic">Log Expense</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setUseMagicMode(true)}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
              useMagicMode ? 'bg-white shadow-sm' : 'text-slate-500'
            }`}
          >
            <Sparkles size={16} className="inline mr-2" />
            Magic Log
          </button>
          <button
            onClick={() => setUseMagicMode(false)}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
              !useMagicMode ? 'bg-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Manual
          </button>
        </div>

        {useMagicMode ? (
          <>
            {/* Magic Log Mode */}
            <textarea
              autoFocus
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              className="w-full p-6 bg-slate-50 rounded-3xl mb-4 font-bold outline-none resize-none"
              placeholder="Try: 5000 JPY for sushi with Bella"
              rows={2}
            />
            
            {parsedExpense && parsedExpense.amount > 0 && (
              <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Parsed Result</p>
                <p className="font-bold">{parsedExpense.desc}</p>
                <p className="text-sm text-slate-600">
                  {parsedExpense.amount} {parsedExpense.currency} • Split with {parsedExpense.splitWith.length} people
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Mode */}
            <input
              type="text"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="Description"
              className="w-full p-4 bg-slate-100 rounded-2xl mb-4 font-bold outline-none"
            />
            
            <div className="flex gap-3 mb-4">
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold outline-none"
              />
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="p-4 bg-slate-100 rounded-2xl font-bold outline-none"
              >
                {Object.keys(CURRENCIES).map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>

            {/* Member Selection */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Split with</p>
              <div className="flex flex-wrap gap-2">
                {trip.members.map(member => (
                  <button
                    key={member.name}
                    onClick={() => toggleMember(member.name)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                      selectedMembers.includes(member.name)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {member.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Category Selection */}
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!expenseToSave || expenseToSave.amount <= 0 || isLoading}
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  );
}