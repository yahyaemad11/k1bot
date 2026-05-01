'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Flame, Users, MessageSquare, TrendingUp } from 'lucide-react';

type Summary = {
  totalLeads: number;
  byStatus: Record<string, number>;
  totalMessages: number;
  inbound: number;
  outbound: number;
  conversionRate: number;
  series: { d: string; c: number }[];
};

const STATUS_AR: Record<string, string> = {
  cold: 'بارد',
  warm: 'دافئ',
  hot: 'ساخن',
  closed: 'تم البيع',
  lost: 'مفقود',
};

export default function OverviewPage() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    api<Summary>('/api/analytics/summary').then(setS).catch(() => {});
    const t = setInterval(
      () => api<Summary>('/api/analytics/summary').then(setS).catch(() => {}),
      15000
    );
    return () => clearInterval(t);
  }, []);

  const cards = [
    { label: 'إجمالي العملاء', value: s?.totalLeads ?? '—', icon: Users, color: 'text-sky-400' },
    { label: 'عملاء ساخنون', value: s?.byStatus?.hot ?? 0, icon: Flame, color: 'text-red-400' },
    { label: 'الرسائل', value: s?.totalMessages ?? 0, icon: MessageSquare, color: 'text-emerald-400' },
    {
      label: 'معدل التحويل',
      value: s ? `${s.conversionRate}%` : '—',
      icon: TrendingUp,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">نظرة عامة</h1>
        <p className="text-sm text-muted">أداء خط المبيعات في الوقت الحقيقي.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card transition hover:border-accent/40">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">{c.label}</span>
                <Icon size={18} className={c.color} />
              </div>
              <div className="mt-2 text-3xl font-bold">{c.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="section-title">توزيع العملاء حسب الحالة</h3>
          <div className="mt-4 space-y-3">
            {['cold', 'warm', 'hot', 'closed', 'lost'].map((k) => {
              const v = s?.byStatus?.[k] || 0;
              const total = s?.totalLeads || 1;
              const pct = (v / total) * 100;
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span>{STATUS_AR[k]}</span>
                    <span className="text-muted">{v}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-l from-accent to-emerald-300 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">عملاء جدد — آخر 7 أيام</h3>
          <div className="mt-4 flex h-40 items-end gap-2">
            {(s?.series || []).map((p) => (
              <div key={p.d} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-accent to-emerald-300 transition-all"
                  style={{ height: `${Math.min(100, p.c * 20)}%`, minHeight: 4 }}
                  title={`${p.d}: ${p.c}`}
                />
                <span className="text-[10px] text-muted">{p.d.slice(5)}</span>
              </div>
            ))}
            {(!s || !s.series.length) && (
              <p className="w-full text-center text-sm text-muted">لا بيانات بعد.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
