import * as React from 'react';
import { useUIStore } from '@/store/useUIStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from './button';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  const borderColors = {
    success: 'border-emerald-500/20 bg-emerald-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md text-foreground transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 ${borderColors[toast.type]}`}
        >
          <div className="mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 -mt-1 -mr-1 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
};
