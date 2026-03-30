import React from 'react';
import { Plane } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
      <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center shadow-xl rotate-6 mb-8 text-white">
        <Plane size={40} />
      </div>
      <h1 className="text-4xl font-black mb-2">
        Moneybill<span className="text-indigo-600">counter</span>
      </h1>
      <p className="text-slate-400 font-medium mb-12">
        Split bills in HKD, JPY & TWD effortlessly.
      </p>
      <button
        onClick={onLogin}
        className="w-full max-w-xs bg-white border border-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg"
          className="w-5"
          alt="Google"
        />
        Continue with Google
      </button>
    </div>
  );
}