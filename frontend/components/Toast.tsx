'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; msg: string; type: ToastType };

const Ctx = createContext<{ push: (msg: string, type?: ToastType) => void }>({
  push: () => {},
});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((msg: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, msg, type }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-50 flex flex-col gap-2">
        {items.map((t) => {
          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
              ? AlertTriangle
              : Info;
          const color =
            t.type === 'success'
              ? 'text-emerald-400 border-emerald-500/30'
              : t.type === 'error'
              ? 'text-red-400 border-red-500/30'
              : 'text-sky-400 border-sky-500/30';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto fade-in flex max-w-sm items-center gap-2 rounded-xl border bg-panel/95 p-3 text-sm shadow-lg backdrop-blur ${color}`}
            >
              <Icon size={18} />
              <span className="flex-1 text-gray-200">{t.msg}</span>
              <button
                onClick={() =>
                  setItems((p) => p.filter((x) => x.id !== t.id))
                }
                className="text-gray-500 hover:text-gray-300"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
