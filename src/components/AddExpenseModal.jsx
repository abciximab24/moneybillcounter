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
  const [selectedPayer, setSelectedPayer] = useState(user.name);
  const [splitMode, setSplitMode] = useState('all'); // 'all', 'specific', 'exclude'
  const [selectedMembers, setSelectedMembers] = useState(trip.members.map(m => m.name));
  const [useMagicMode, setUseMagicMode] = useState(true);

  // Parse natural language input with payer and split parsing
  const parsedExpense = useMemo(() => {
    if (!nlInput.trim()) return null;
    
    let text = nlInput;
    let payer = user.name;
    let splitWith = [...trip.members.map(m => m.name)];
    let mode = 'all';
    
    // Parse payer: "X paid" or "paid by X"
    const payerMatch = text.match(/(?:^|\s)(\w+)\s+(?:paid|pay)/i) || 
                       text.match(/paid\s+by\s+(\w+)/i);
    if (payerMatch) {
      const payerName = trip.members.find(m => 
        m.name.toLowerCase().includes(payerMatch[1].toLowerCase())
      );
      if (payerName) {
        payer = payerName.name;
        text = text.replace(payerMatch[0], ' ');
      }
    }
    
    // Parse split: "with X and Y" or "split with X, Y"
    const withMatch = text.match(/(?:with|split\s+with)\s+([\w\s,]+)/i);
    if (withMatch) {
      const names = withMatch[1].split(/[,\s]+/).filter(n => n.trim());
      const matchedMembers = names.map(name => 
        trip.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
      ).filter(Boolean).map(m => m.name);
      
      if (matchedMembers.length > 0) {
        splitWith = matchedMembers;
        mode = 'specific';
        text = text.replace(withMatch[0], ' ');
      }
    }
    
    // Parse exclude: "except X" or "all except X"
    const exceptMatch = text.match(/(?:all\s+)?except\s+([\w\s,]+)/i);
    if (exceptMatch) {
      const names = exceptMatch[1].split(/[,\s]+/).filter(n => n.trim());
      const excludedMembers = names.map(name => 
        trip.members.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
      ).filter(Boolean).map(m => m.name);
      
      if (excludedMembers.length > 0) {
        splitWith = trip.members.map(m => m.name).filter(n => !excludedMembers.includes(n));
        mode = 'exclude';
        text = text.replace(exceptMatch[0], ' ');
      }
    }
    
    // Extract amount
    const amountMatch = text.match(/(\d+(\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
    
    // Extract currency
    const currency = parseCurrencyFromText(text) || trip.baseCurrency;
    
    // Clean description
    const desc = text
      .replace(/\d+(\.\d+)?/g, '')
      .replace(/(jpy|twd|hkd|yen|for|with|split|nt|hk\$|¥|NT\$|paid|pay|except|all)/gi, '')
      .replace(trip.members.map(m => m.name.split(' ')[0]).join('|'), 'gi', '')
      .trim() || 'Expense';
    
    return {
      desc,
      amount,
      currency,
      payer,
      splitWith,
      splitMode: mode
    };
  }, [nlInput, trip, user]);

  // Manual mode validation
  const manualExpense = useMemo(() => {
    if (useMagicMode) return null;
    
    const amount = parseFloat(manualAmount) || 0;
    if (amount <= 0 || !manualDesc.trim()) return null;
    
    let splitWith = selectedMembers;
    if (splitMode === 'all') {
      splitWith = trip.members.map(m => m.name);
    } else if (splitMode === 'exclude') {
      // selectedMembers contains members to EXCLUDE
      splitWith = trip.members.map(m => m.name).filter(n => !selectedMembers.includes(n));
    }
    
    return {
      desc: manualDesc.trim(),
      amount,
      currency: selectedCurrency,
      payer: selectedPayer,
      splitWith,
      splitMode
    };
  }, [useMagicMode, manualAmount, manualDesc, selectedCurrency, selectedPayer, splitMode, selectedMembers, trip]);

  const expenseToSave = useMagicMode ? parsedExpense : manualExpense;

  const handleSave = () => {
    if (!expenseToSave || expenseToSave.amount <= 0) return;
    
    // Validate splitWith isn't empty (prevents division by zero in settlements)
    if (!expenseToSave.splitWith || expenseToSave.splitWith.length === 0) {
      return; // Don't save expenses with no one to split
    }
    
    onSave({
      ...expenseToSave,
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

  const getSplitPreview = () => {
    if (!expenseToSave || !expenseToSave.splitWith || expenseToSave.splitWith.length === 0) return null;
    
    const perPerson = expenseToSave.amount / expenseToSave.splitWith.length;
    return {
      members: expenseToSave.splitWith,
      perPerson
    };
  };

  const splitPreview = getSplitPreview();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
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
              placeholder='Try: "5000 JPY for sushi with Bella" or "Lunch Mike paid except John"'
              rows={3}
            />
            
            {parsedExpense && parsedExpense.amount > 0 && (
              <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Parsed Result</p>
                <p className="font-bold">{parsedExpense.desc}</p>
                <p className="text-sm text-slate-600">
                  {parsedExpense.amount} {parsedExpense.currency} • Paid by {parsedExpense.payer}
                </p>
                <p className="text-sm text-slate-600">
                  Split with {parsedExpense.splitWith.length} {parsedExpense.splitWith.length === 1 ? 'person' : 'people'}
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

            {/* Payer Selection */}
            <div className="mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Who Paid?</p>
              <select
                value={selectedPayer}
                onChange={(e) => setSelectedPayer(e.target.value)}
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

        {/* Split Preview */}
        {splitPreview && (
          <div className="bg-slate-50 p-4 rounded-2xl mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Split Preview</p>
            <p className="font-bold text-lg">
              {splitPreview.perPerson.toFixed(2)} {expenseToSave?.currency} each
            </p>
            <p className="text-sm text-slate-500">
              Split between {splitPreview.members.join(', ')}
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={
            !expenseToSave || 
            expenseToSave.amount <= 0 || 
            isLoading || 
            !Array.isArray(expenseToSave.splitWith) || 
            expenseToSave.splitWith.length === 0
          }
          title={(!expenseToSave || !Array.isArray(expenseToSave.splitWith) || expenseToSave.splitWith.length === 0) ? 'Select at least one person to split with' : ''}
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  );
}