'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { LogOut, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/Toast';

const STATE_AR: Record<string, string> = {
  disconnected: 'غير متصل',
  connecting: 'جاري الاتصال',
  qr: 'بانتظار المسح',
  connected: 'متصل',
};

const STATE_COLOR: Record<string, string> = {
  connected: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
  qr: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  connecting: 'bg-sky-600/20 text-sky-300 border-sky-500/30',
  disconnected: 'bg-panel2 text-gray-300 border-border',
};

export default function ConnectPage() {
  const { push } = useToast();
  const [state, setState] = useState<string>('disconnected');
  const [qr, setQr] = useState<string | null>(null);

  async function refresh() {
    const s = await api<{ state: string; qr: string | null }>(
      '/api/whatsapp/state'
    );
    setState(s.state);
    setQr(s.qr);
  }

  useEffect(() => {
    refresh();
    const s = getSocket();
    s.on('wa:state', (p: any) => setState(p.state));
    s.on('wa:qr', (p: any) => {
      setQr(p.qr);
      setState('qr');
    });
    return () => {
      s.off('wa:state');
      s.off('wa:qr');
    };
  }, []);

  async function logout() {
    if (!confirm('هل أنت متأكد من فصل واتساب؟')) return;
    await api('/api/whatsapp/logout', { method: 'POST' });
    push('تم فصل الجلسة', 'info');
    refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ربط واتساب</h1>
        <p className="text-sm text-muted">
          امسح رمز الاستجابة السريعة من تطبيق واتساب بزنس:{' '}
          <span className="text-gray-300">الإعدادات ← الأجهزة المرتبطة ← ربط جهاز</span>.
        </p>
      </div>

      <div className="card grid place-items-center p-10">
        <div className="mb-4 text-sm">
          الحالة:{' '}
          <span className={`badge border ${STATE_COLOR[state]}`}>
            {STATE_AR[state] || state}
          </span>
        </div>

        {state === 'connected' && (
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <ShieldCheck size={30} />
            </div>
            <p className="text-lg font-semibold text-emerald-400">
              واتساب متصل ويعمل
            </p>
            <p className="mt-1 text-sm text-muted">
              النظام يستقبل الرسائل ويرد تلقائياً.
            </p>
            <button onClick={logout} className="btn-danger mt-5 text-sm">
              <LogOut size={14} /> فصل الجلسة
            </button>
          </div>
        )}

        {state !== 'connected' && qr && (
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-2 text-muted">
              <Smartphone size={16} /> افتح واتساب على هاتفك وامسح الرمز
            </div>
            <img
              src={qr}
              alt="WhatsApp QR"
              className="h-72 w-72 rounded-2xl bg-white p-3"
            />
          </div>
        )}

        {state !== 'connected' && !qr && (
          <div className="flex flex-col items-center gap-3 text-muted">
            <p>جاري تجهيز رمز المسح…</p>
            <button onClick={refresh} className="btn-ghost text-sm">
              <RefreshCw size={14} /> تحديث
            </button>
          </div>
        )}
      </div>

      <div className="card space-y-2 text-sm text-muted">
        <p className="flex items-center gap-2 text-gray-300">
          <ShieldCheck size={16} className="text-emerald-400" /> نصائح لحماية
          رقمك من الحظر:
        </p>
        <ul className="mr-6 list-disc space-y-1">
          <li>سخّن الأرقام الجديدة تدريجياً قبل تفعيل الأتمتة.</li>
          <li>لا ترسل رسائل جماعية أو إعلانات بدون طلب العميل.</li>
          <li>النظام يحترم أوامر "إيقاف" ويكشف الأرقام الغلط تلقائياً.</li>
          <li>اضبط الحد اليومي للرسائل من صفحة الإعدادات.</li>
        </ul>
      </div>
    </div>
  );
}
