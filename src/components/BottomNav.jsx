import React from 'react';
import { Home, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-md mx-auto flex justify-around py-2">
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center py-2 px-6 rounded-2xl transition-colors ${
            activeTab === 'home'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home size={24} />
          <span className="text-xs font-bold mt-1">Trips</span>
        </button>
        
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center py-2 px-6 rounded-2xl transition-colors ${
            activeTab === 'profile'
              ? 'text-indigo-600 bg-indigo-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User size={24} />
          <span className="text-xs font-bold mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
}