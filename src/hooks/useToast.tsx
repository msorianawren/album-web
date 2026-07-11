import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProviderCore({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastInput: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const newToast = { ...toastInput, id };
    
    setToasts((current) => [...current, newToast]);

    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration || 3000);
    }
  }, [removeToast]);

  const toastObj = React.useMemo(() => ({
    success: (message: string, duration?: number) => addToast({ type: "success", message, duration }),
    error: (message: string, duration?: number) => addToast({ type: "error", message, duration }),
    info: (message: string, duration?: number) => addToast({ type: "info", message, duration }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, toast: toastObj, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProviderCore or ToastProvider");
  }
  return context;
}
