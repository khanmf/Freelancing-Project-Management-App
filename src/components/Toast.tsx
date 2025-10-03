import React, { useState, useEffect } from 'react';
import { ToastMessage } from '../types';
import { CheckCircleIcon, XMarkIcon, InformationCircleIcon } from './icons/Icons';

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isFadingOut) {
      const timer = setTimeout(() => onDismiss(message.id), 500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isFadingOut, onDismiss, message.id]);

  const { type, message: text } = message;

  const baseClasses = "flex items-center w-full max-w-xs p-4 text-gray-200 bg-gray-800 rounded-lg shadow-lg border border-gray-700";
  const typeClasses = {
    success: 'border-l-4 border-green-500',
    error: 'border-l-4 border-red-500',
    info: 'border-l-4 border-blue-500',
  };

  const Icon = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
    error: <XMarkIcon className="h-6 w-6 text-red-400" />,
    info: <InformationCircleIcon className="h-6 w-6 text-blue-400" />,
  }[type];

  const animationClass = isFadingOut ? 'animate-toast-out-right' : 'animate-toast-in-right';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${animationClass}`} role="alert">
      <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg">
        {Icon}
      </div>
      <div className="ml-3 text-sm font-normal">{text}</div>
      <button 
        type="button" 
        className="ml-auto -mx-1.5 -my-1.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8" 
        aria-label="Close" 
        onClick={() => setIsFadingOut(true)}
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;