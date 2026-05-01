'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Search, Trash2 } from 'lucide-react';
import { api, API_URL, getToken } from '@/lib/api';
import { useToast } from '@/components/Toast';

type Lead = {
  id: number;
  jid: string;
  phone: string;
  name: string | null;
  status: string;
  score: number;
  last_message_at: number | null;
};

const STATUS_AR: Record<string, string> = {
  cold: 'بارد',
  warm: 'دافئ',
  hot: 'ساخن',
  closed: 'تم البيع',
  lost: 'مفقود',
};
const STATUS_COLORS: Record<string, string> = {
  cold: 'bg-gray-700/50 text-gray-200',
  warm: 'bg-yellow-600/20 text-yellow-300',
  hot: 'bg-red-600/20 text-red-300',
  closed: 'bg-emerald-600/20 text-emerald-300',
  lost: 'bg-zinc-700/50 text-zinc-400',
};

export default function LeadsPage() {
  const { push } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleOne(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => (s.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))));
  }

  async function deleteOne(id: number, label: string) {
    if (!confirm(`سيتم حذف المحادثة مع ${label} نهائياً. متأكد؟`)) return;
    try {
      await api(`/api/leads/${id}`, { method: 'DELETE' });
      push('تم حذف المحادثة', 'success');
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      load();
    } catch {
      push('تعذر الحذف', 'error');
    }
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!confirm(`سيتم حذف ${selected.size} محادثة نهائياً. هل أنت متأكد؟`)) return;
    try {
      const r = await api<{ deleted: number }>('/api/leads/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      push(`تم حذف ${r.deleted} محادثة`, 'success');
      setSelected(new Set());
      load();
    } catch {
      push('تعذر الحذف الجماعي', 'error');
    }
  }

  async function load() {
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (q) params.set('q', q);
    const res = await api<{ leads: Lead[] }>(`/api/leads?${params}`);
    setLeads(res.leads);
  }

  useEffect(() => {
    load();
  }, [filter]);

  function exportCsv() {
    const token = getToken();
    fetch(`${API_URL}/api/analytics/export`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'leads.csv';
        a.click();
      });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-sm text-muted">قائمة كل العملاء مع درجة اهتمامهم.</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="btn-danger text-sm">
              <Trash2 size={15} /> حذف {selected.size} محددة
            </button>
          )}
          <button onClick={exportCsv} className="btn-ghost text-sm">
            <Download size={15} /> تصدير CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { v: '', l: 'الكل' },
          { v: 'cold', l: 'بارد' },
          { v: 'warm', l: 'دافئ' },
          { v: 'hot', l: 'ساخن' },
          { v: 'closed', l: 'تم البيع' },
          { v: 'lost', l: 'مفقود' },
        ].map((s) => (
          <button
            key={s.v || 'all'}
            onClick={() => setFilter(s.v)}
            className={`badge px-3 py-1.5 transition ${
              filter === s.v
                ? 'bg-accent text-black font-semibold'
                : 'bg-panel2 text-gray-300 hover:bg-panel'
            }`}
          >
            {s.l}
          </button>
        ))}
        <div className="relative mr-auto max-w-xs flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            className="input pr-9"
            placeholder="بحث بالاسم أو الرقم…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-panel2 text-right text-muted">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#a855f7]"
                  checked={leads.length > 0 && selected.size === leads.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="p-3 font-medium">الاسم</th>
              <th className="p-3 font-medium">الرقم</th>
              <th className="p-3 font-medium">الحالة</th>
              <th className="p-3 font-medium">النقاط</th>
              <th className="p-3 font-medium">آخر نشاط</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className="border-t border-border transition hover:bg-panel2/50"
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#a855f7]"
                    checked={selected.has(l.id)}
                    onChange={() => toggleOne(l.id)}
                  />
                </td>
                <td className="p-3 font-medium">{l.name || '—'}</td>
                <td className="p-3 font-mono text-xs" dir="ltr">
                  +{l.phone}
                </td>
                <td className="p-3">
                  <span
                    className={`badge ${
                      STATUS_COLORS[l.status] || 'bg-panel2 text-gray-300'
                    }`}
                  >
                    {STATUS_AR[l.status] || l.status}
                  </span>
                </td>
                <td className="p-3">{l.score}</td>
                <td className="p-3 text-muted">
                  {l.last_message_at
                    ? new Date(l.last_message_at * 1000).toLocaleString('ar')
                    : '—'}
                </td>
                <td className="p-3 text-left">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/dashboard/chats?lead=${l.id}`}
                      className="text-accent hover:underline"
                    >
                      فتح المحادثة ←
                    </Link>
                    <button
                      onClick={() => deleteOne(l.id, l.name || `+${l.phone}`)}
                      title="حذف المحادثة"
                      className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!leads.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted">
                  لا يوجد عملاء بعد. اربط واتساب لتبدأ في استقبال المحادثات.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
