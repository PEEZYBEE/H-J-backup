import React, { useState, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const ICONS = {
  warning: FiAlertTriangle,
  error: FiAlertCircle,
  success: FiCheckCircle,
  info: FiInfo,
};

const COLORS = {
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  success: 'bg-green-50 border-green-400 text-green-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
};

const ICON_COLORS = {
  warning: 'text-yellow-500',
  error: 'text-red-500',
  success: 'text-green-500',
  info: 'text-blue-500',
};

let addToastGlobal = null;

export function toast(message, type = 'info', duration = 5000) {
  if (addToastGlobal) {
    addToastGlobal({ message, type, duration });
  }
}

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type, duration }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onClose={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast: t, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(t.id), t.duration || 5000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onClose]);

  const Icon = ICONS[t.type] || FiInfo;

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg animate-slide-in ${COLORS[t.type] || COLORS.info}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ICON_COLORS[t.type] || ICON_COLORS.info}`} />
      <p className="text-sm flex-1">{t.message}</p>
      <button onClick={() => onClose(t.id)} className="flex-shrink-0 hover:opacity-70">
        <FiX className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ToastContainer;
