import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';

export default function CreateTripModal({ user, onClose, onCreate, isLoading }) {
  const [tripName, setTripName] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('HKD');

  const handleCreate = async () => {
    if (!tripName.trim()) return;

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await onCreate({
      name: tripName.trim(),
      baseCurrency,
      inviteCode,
      creatorEmail: user.email,
      memberEmails: [user.email],
      members: [{ name: user.name, email: user.email, isClaimed: true }]
    });

    setTripName('');
    setBaseCurrency('HKD');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">New Trip</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <input
          type="text"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          placeholder="Trip Name (e.g., Tokyo 2024)"
          className="w-full p-6 bg-slate-100 rounded-3xl mb-4 font-bold outline-none"
          autoFocus
        />

        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Base Currency</p>
          <div className="flex gap-2">
            {Object.keys(CURRENCIES).map(curr => (
              <button
                key={curr}
                onClick={() => setBaseCurrency(curr)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  baseCurrency === curr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            All expenses will be converted to this currency for tracking
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={!tripName.trim() || isLoading}
          className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : 'Start Adventure'}
        </button>
      </div>
    </div>
  );
}