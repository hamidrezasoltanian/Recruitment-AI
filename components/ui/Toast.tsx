
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = toast.type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return (
    <div
      className={`flex items-center justify-between w-full max-w-xs p-4 text-white ${bgColor} rounded-lg shadow-lg transform transition-all duration-300 ease-out ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
      role="alert"
    >
      <div className="text-sm font-medium">{toast.message}</div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-4 -mr-1.5 -my-1.5 bg-white/20 text-white rounded-lg p-1.5 inline-flex h-8 w-8 hover:bg-white/30"
      >
        <span className="sr-only">بستن</span>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; dismissToast: (id: number) => void }> = ({ toasts, dismissToast }) => {
  return ReactDOM.createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>,
    document.getElementById('toast-root')!
  );
};
