"use client";

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          "relative w-full max-w-lg transform rounded-2xl bg-white/80 backdrop-blur-2xl p-6 text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 duration-200 border border-white/40",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-medium leading-6 text-[#161B33]">{title}</h3>}
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
}
