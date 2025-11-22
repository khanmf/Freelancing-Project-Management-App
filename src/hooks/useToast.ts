
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { ToastMessage, ToastContextType } from '../types';
import Toast from '../components/Toast';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // CRITICAL FIX: Wrapped in useCallback to prevent infinite loops in useEffects that depend on addToast
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return React.createElement(
    ToastContext.Provider,
    { value: { addToast } },
    children,
    React.createElement(
      'div',
      { className: 'fixed top-4 right-4 z-[100] space-y-2' },
      toasts.map(toast =>
        React.createElement(Toast, {
          key: toast.id,
          message: toast,
          onDismiss: removeToast,
        })
      )
    )
  );
};
