import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { getAllEmojis } from '../utils/emojis';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../App';

export default function ProfilePage({ user, userProfile, onProfileUpdate, showToast }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user.name || '');
  const [selectedEmoji, setSelectedEmoji] = useState(userProfile?.emoji || '👤');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const allEmojis = getAllEmojis();

  const handleSave = async () => {
    if (!displayName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        emoji: selectedEmoji,
        photoURL: user.photo,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'users', user.uid), profileData, { merge: true });
      
      onProfileUpdate(profileData);
      showToast('Profile updated!', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-black mb-6">Profile</h2>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-6xl hover:scale-110 transition-transform"
            >
              {selectedEmoji}
            </button>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-2xl shadow-lg border border-slate-200 z-10 w-72">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Choose Your Emoji</p>
                <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                  {allEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className={`text-2xl hover:bg-slate-100 p-1 rounded transition-colors ${
                        selectedEmoji === emoji ? 'bg-indigo-100' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user.photo && (
            <img 
              src={user.photo} 
              alt={user.name} 
              className="w-16 h-16 rounded-full opacity-50"
            />
          )}
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={50}
          />
          <p className="text-xs text-slate-400 mt-1">{displayName.length}/50 characters</p>
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Email</label>
          <div className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-500">
            {user.email}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading || !displayName.trim()}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          {isLoading ? (
            'Saving...'
          ) : (
            <>
              <Save size={20} />
              Save Profile
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-indigo-50 rounded-2xl">
        <p className="text-sm font-bold text-indigo-600 mb-2">Tips</p>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• Your emoji appears in expenses and settlements</li>
          <li>• Display name is shown to other trip members</li>
          <li>• Changes are saved to your account</li>
        </ul>
      </div>
    </div>
  );
}