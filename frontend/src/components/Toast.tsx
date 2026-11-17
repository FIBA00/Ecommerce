'use client';

/**
 * [EDUCATIONAL NOTE: Toast Feedback Component]
 * 
 * 1. Architecture Role:
 *    Lightweight floating notification banner presenting success or error alerts to the user.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Displays HTTP status outcomes (e.g. 201 Created on checkout, 400 Bad Request on stock depletion).
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor =
    type === 'success'
      ? 'bg-green-50 text-green-800 border-green-200'
      : type === 'error'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-blue-50 text-blue-800 border-blue-200';

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg transition-all text-sm ${bgColor}`}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:opacity-75 transition rounded"
        aria-label="Close alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default Toast;
