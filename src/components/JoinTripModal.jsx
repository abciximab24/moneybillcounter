import React, { useState } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../App';
import { assignEmojiToMember } from '../utils/emojis';

export default function JoinTripModal({ user, userProfile, onClose, onJoined, showToast }) {
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundTrip, setFoundTrip] = useState(null);

  const searchTrip = async () => {
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'trips'),
        where('inviteCode', '==', inviteCode.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        showToast('No trip found with this code', 'error');
        setFoundTrip(null);
      } else {
        const tripDoc = snapshot.docs[0];
        const tripData = tripDoc.data();
        
        // Check if already a member
        if (tripData.memberEmails.includes(user.email)) {
          showToast('You are already a member of this trip', 'info');
          setFoundTrip(null);
          return;
        }

        setFoundTrip({ id: tripDoc.id, ...tripData });
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Failed to search for trip', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const joinTrip = async () => {
    if (!foundTrip) return;

    setIsLoading(true);
    try {
      // Get user's emoji from profile, or assign a new one
      const existingEmojis = foundTrip.members?.filter(m => m.emoji).map(m => m.emoji) || [];
      const userEmoji = userProfile?.emoji || assignEmojiToMember({ name: user.name }, existingEmojis);

      await updateDoc(doc(db, 'trips', foundTrip.id), {
        memberEmails: arrayUnion(user.email),
        members: arrayUnion({
          name: user.name,
          email: user.email,
          isClaimed: true,
          emoji: userEmoji
        })
      });
      
      showToast(`Joined "${foundTrip.name}" successfully!`, 'success');
      onJoined();
    } catch (error) {
      console.error('Join error:', error);
      showToast('Failed to join trip', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[50] flex items-end" onClick={handleBackdropClick}>
      <div className="bg-white w-full max-w-md mx-auto rounded-t-[48px] p-8 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">Join Trip</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="flex-1 p-4 bg-slate-100 rounded-2xl font-bold outline-none uppercase tracking-widest"
            maxLength={8}
            autoFocus
          />
          <button
            onClick={searchTrip}
            disabled={!inviteCode.trim() || isLoading}
            className="p-4 bg-indigo-600 text-white rounded-2xl disabled:opacity-50"
          >
            <Search size={20} />
          </button>
        </div>

        {foundTrip && (
          <div className="bg-indigo-50 p-6 rounded-3xl mb-6">
            <p className="text-xs font-bold text-indigo-600 uppercase mb-2">Trip Found</p>
            <h3 className="text-xl font-bold mb-2">{foundTrip.name}</h3>
            <p className="text-sm text-slate-600">
              {foundTrip.members.length} member{foundTrip.members.length !== 1 ? 's' : ''} • {foundTrip.baseCurrency}
            </p>
            
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {foundTrip.members.map((member, idx) => (
                  <span key={idx} className="bg-white px-3 py-1 rounded-xl text-sm font-medium">
                    {member.name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={joinTrip}
              disabled={isLoading}
              className="w-full mt-4 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={20} className="animate-spin" />}
              {isLoading ? 'Joining...' : 'Join This Trip'}
            </button>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Ask your trip organizer for the invite code
        </p>
      </div>
    </div>
  );
}