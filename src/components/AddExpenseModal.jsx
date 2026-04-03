import React, { useState, useMemo } from 'react';
import { X, Sparkles, Plane, Utensils, Landmark, ShoppingBag, Car, Home, MoreHorizontal, Loader2 } from 'lucide-react';
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

export default function AddExpenseModal({ trip, user, userProfile, onClose, onSave, isLoading }) {
  // Get the current user's name from their trip member profile (not Google name)
  const currentUserTripMember = trip.members.find(m => m.email === user?.email);
  const userDisplayName = currentUserTripMember?.name || userProfile?.displayName || user?.name;

  const [nlInput, setNlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('other');
  const [selectedCurrency, setSelectedCurrency] = useState(trip.baseCurrency);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [selectedPayer, setSelectedPayer] = useState(userDisplayName || user?.name);
  const [splitMode, setSplitMode] = useState('all'); // 'all', 'select'
  const [selectedMembers, setSelectedMembers] = useState(trip.members.map(m => m.name));
  const [useMagicMode, setUseMagicMode] = useState(true);

  // Parse natural language input with payer and split parsing
  const parsedExpense = useMemo(() => {
    if (!nlInput.trim()) return null;
    
    let text = nlInput;
    let payer = userDisplayName; // Default to current user's display name
    let splitWith = [...trip.members.map(m => m.name)];
    let mode = 'all';
    
    // Helper: find member by name (case-insensitive, supports multi-word and non-ASCII)
    const findMember = (searchName) => {
      if (!searchName) return null;
      return trip.members.find(m => 
        m.name.toLowerCase().includes(searchName.toLowerCase()) ||
        searchName.toLowerCase().includes(m.name.toLowerCase())
      );
    };
    
    // Get sorted member names (longest first) to avoid partial matches
    const sortedMembers = [...trip.members].sort((a, b) => b.name.length - a.name.length);
    
    // Build escaped member names for regex
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Parse payer patterns - check for member names in payment contexts
    let payerFound = false;
    
    // Pattern 1: "paid by <member name>"
    for (const member of sortedMembers) {
      const escapedName = escapeRegex(member.name);
      const regex = new RegExp(`paid\\s+by\\s+(${escapedName})`, 'i');
      const match = text.match(regex);
      if (match) {
        payer = member.name;
        text = text.replace(match[0], ' ');
        payerFound = true;
        break;
      }
    }
    
    // Pattern 2: "<member name> paid" or "<member name> pay" (NOT "paid for" to avoid conflict with "for occasion")
    if (!payerFound) {
      for (const member of sortedMembers) {
        const escapedName = escapeRegex(member.name);
        const regex = new RegExp(`(${escapedName})\\s+(paid|pay)\\b`, 'i');
        const match = text.match(regex);
        if (match) {
          // Make sure it's not "paid for <someone>" which means payment purpose not payer
          const afterPaid = text.substring(match.index + match[0].length);
          if (!afterPaid.trim().toLowerCase().startsWith('for') || !findMember(afterPaid.trim().split(/\s+/)[0])) {
            payer = member.name;
            text = text.replace(match[0], ' ');
            payerFound = true;
            break;
          }
        }
      }
    }
    
    // Parse split: "with X and Y", "split with X, Y", or "for X, Y"
    // Try "with" pattern first
    const withMatch = text.match(/(?:with|split\s+with)\s+([\p{L}\p{N}\s,]+)/iu);
    if (withMatch) {
      const names = withMatch[1].split(/[,\s]+/).filter(n => n.trim());
      const matchedMembers = names.map(name => findMember(name)).filter(Boolean).map(m => m.name);
      
      if (matchedMembers.length > 0) {
        splitWith = matchedMembers;
        mode = 'specific';
        text = text.replace(withMatch[0], ' ');
      }
    } else {
      // Try "for <names>" pattern - only if followed by member names
      const forMatch = text.match(/\bfor\s+([\p{L}\p{N}\s,]+)/iu);
      if (forMatch) {
        const names = forMatch[1].split(/[,\s]+/).filter(n => n.trim());
        // Check if the names match actual trip members
        const matchedMembers = names.map(name => findMember(name)).filter(Boolean).map(m => m.name);
        
        if (matchedMembers.length > 0) {
          // "for" followed by member names means split target
          splitWith = matchedMembers;
          mode = 'specific';
          text = text.replace(forMatch[0], ' ');
        }
        // If "for" is followed by non-member names (like "sushi"), keep it as description
      }
    }
    
    // Parse exclude: "except X" or "all except X"
    const exceptMatch = text.match(/(?:all\s+)?except\s+([\p{L}\p{N}\s,]+)/iu);
    if (exceptMatch) {
      const names = exceptMatch[1].split(/[,\s]+/).filter(n => n.trim());
      const excludedMembers = names.map(name => findMember(name)).filter(Boolean).map(m => m.name);
      
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
    
    // Build pattern to remove from description
    const memberNamePattern = sortedMembers.map(m => escapeRegex(m.name)).join('|');
    
    // Clean description - remove payment keywords, amounts, currencies, member names
    const desc = text
      .replace(/\d+(\.\d+)?/g, '') // amounts
      .replace(/(jpy|twd|hkd|yen|nt|hk\$|¥|nt\$)/gi, '') // currencies
      .replace(/\b(paid|pay|by|with|split|except|all)\b/gi, '') // payment keywords (NOT 'for')
      .replace(memberNamePattern, '') // member names (full names)
      .replace(/[,.\-\s]+/g, ' ') // normalize whitespace
      .trim() || 'Expense';
    
    return {
      desc,
      amount,
      currency,
      payer,
      splitWith,
      splitMode: mode
    };
  }, [nlInput, trip, userDisplayName]);

  // Manual mode validation
  const manualExpense = useMemo(() => {
    if (useMagicMode) return null;
    
    const amount = parseFloat(manualAmount) || 0;
    if (amount <= 0 || !manualDesc.trim()) return null;
    
    let splitWith = selectedMembers;
    if (splitMode === 'all') {
      splitWith = trip.members.map(m => m.name);
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end" onClick={handleBackdropClick}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 max-h-[90vh] overflow-y-auto">
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
              placeholder='Try: "5000 JPY for sushi for Bella" or "Mike paid 100 TWD for dinner" or "Alice paid for Bob, Charlie except Dan"'
              rows={3}
            />
            
            {parsedExpense && parsedExpense.amount > 0 && (
              <div className="bg-indigo-50 p-4 rounded-2xl mb-4">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Parsed Result</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-slate-500">Description:</span> <span className="font-bold">{parsedExpense.desc}</span></p>
                  <p><span className="text-slate-500">Amount:</span> <span className="font-bold">{parsedExpense.amount} {parsedExpense.currency}</span></p>
                  <p><span className="text-slate-500">Paid by:</span> <span className="font-bold">{parsedExpense.payer}</span></p>
                  <p><span className="text-slate-500">Split with:</span> <span className="font-bold">{parsedExpense.splitWith.join(', ')}</span></p>
                </div>
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
                  onClick={() => setSplitMode('select')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    splitMode === 'select' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Select
                </button>
              </div>

          {splitMode === 'select' && (
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
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={20} className="animate-spin" />}
          {isLoading ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  );
}