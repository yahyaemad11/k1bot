'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { api, setToken } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState('admin@keyone.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      push('أهلاً بعودتك 👋', 'success');
      router.push('/dashboard');
    } catch {
      push('البريد أو كلمة المرور غير صحيحة', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <form
        onSubmit={onSubmit}
        className="card fade-in w-full max-w-md border-accent/10"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-black">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl font-bold">دخول المالك</h1>
          <p className="mt-1 text-sm text-muted">
            هذه لوحة تحكم خاصة — الدخول مقيد.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              className="input"
              type="email"
              placeholder="admin@keyone.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary mt-2 w-full" disabled={loading}>
            {loading ? 'جاري الدخول...' : (<><LogIn size={18} /> دخول</>)}
          </button>
        </div>
      </form>
    </main>
  );
}
