import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

const TOAST_TYPES = {
  success: {
    bg: 'bg-emerald-500',
    icon: Check,
    iconBg: 'bg-emerald-600'
  },
  error: {
    bg: 'bg-rose-500',
    icon: AlertCircle,
    iconBg: 'bg-rose-600'
  },
  info: {
    bg: 'bg-indigo-500',
    icon: Info,
    iconBg: 'bg-indigo-600'
  }
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-[100] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className={`${config.bg} text-white p-4 rounded-2xl shadow-lg flex items-center gap-3`}>
        <div className={`${config.iconBg} p-2 rounded-xl`}>
          <Icon size={20} />
        </div>
        <p className="flex-1 font-medium text-sm">{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

// Toast manager hook
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}