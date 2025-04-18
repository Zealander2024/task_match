import * as React from "react"
import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

type ToastType = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

const toasts: ToastType[] = [];

const toast = ({ title, description, variant = 'default' }: ToastProps) => {
  sonnerToast[variant === 'destructive' ? 'error' : 'success'](title, {
    description,
  });
};

const useToast = () => {
  return {
    toast,
    toasts: toasts
  };
};

export { useToast, toast };
