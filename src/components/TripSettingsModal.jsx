import React, { useState } from 'react';
import { X, Copy, Check, Trash2 } from 'lucide-react';
import { CURRENCIES } from '../utils/currency';
import { getAllEmojis } from '../utils/emojis';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../App';

export default function TripSettingsModal({ trip, user, userProfile, onClose, onUpdated, showToast }) {
  const [tripName, setTripName] = useState(trip.name);
  const [baseCurrency, setBaseCurrency] = useState(trip.baseCurrency);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // member name or null
  const [members, setMembers] = useState(trip.members);

  const isCreator = trip.creatorEmail === user.email;
  const allEmojis = getAllEmojis();

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    setCopied(true);
    showToast('Invite code copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateEmoji = (memberName, emoji) => {
    setMembers(prev => prev.map(m => 
      m.name === memberName ? { ...m, emoji } : m
    ));
    setShowEmojiPicker(null);
  };

  const handleUpdate = async () => {
    if (!tripName.trim()) return;

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        name: tripName.trim(),
        baseCurrency,
        members,
        updatedAt: Date.now()
      });
      showToast('Trip updated', 'success');
      onUpdated();
    } catch (error) {
      console.error('Update error:', error);
      showToast('Failed to update trip', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trip? This will delete all expenses.')) return;

    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'trips', trip.id));
      showToast('Trip deleted', 'success');
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete trip', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end">
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">Trip Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Invite Code */}
        <div className="bg-indigo-50 p-4 rounded-2xl mb-6">
          <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Invite Code</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black tracking-widest">{trip.inviteCode}</span>
            <button
              onClick={copyInviteCode}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Share this code with friends to let them join</p>
        </div>

        {/* Trip Name */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Trip Name</label>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={!isCreator}
          />
        </div>

        {/* Base Currency */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Base Currency</label>
          <div className="flex gap-2">
            {Object.keys(CURRENCIES).map(curr => (
              <button
                key={curr}
                onClick={() => isCreator && setBaseCurrency(curr)}
                disabled={!isCreator}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                  baseCurrency === curr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                } ${!isCreator ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Members with Emoji */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
            Members ({members.length})
          </label>
          <div className="space-y-2">
            {members.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === member.name ? null : member.name)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      {member.emoji || '👤'}
                    </button>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker === member.name && (
                      <div className="absolute top-10 left-0 bg-white p-3 rounded-2xl shadow-lg border border-slate-200 z-10 w-64">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Choose Emoji</p>
                        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                          {allEmojis.map((emoji, eIdx) => (
                            <button
                              key={eIdx}
                              onClick={() => handleUpdateEmoji(member.name, emoji)}
                              className={`text-xl hover:bg-slate-100 p-1 rounded transition-colors ${
                                member.emoji === emoji ? 'bg-indigo-100' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </div>
                </div>
                {member.email === trip.creatorEmail && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg font-bold">
                    Creator
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            💡 Emoji changes are saved when you click "Save Changes"
          </p>
        </div>

        {/* Actions */}
        {isCreator && (
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-4 bg-rose-100 text-rose-600 rounded-2xl disabled:opacity-50 hover:bg-rose-200 transition-colors"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={handleUpdate}
              disabled={isLoading || !tripName.trim()}
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {!isCreator && (
          <p className="text-xs text-slate-400 text-center">
            Only the trip creator can edit settings
          </p>
        )}
      </div>
    </div>
  );
}