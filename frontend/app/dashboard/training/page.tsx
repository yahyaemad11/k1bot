'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/Toast';

type Item = {
  id: number;
  category: string;
  title: string;
  content: string;
  active: number;
};

const CATEGORIES = [
  { v: 'product', l: 'منتج' },
  { v: 'faq', l: 'سؤال شائع' },
  { v: 'pricing', l: 'تسعير' },
  { v: 'offer', l: 'عرض' },
  { v: 'script', l: 'سكربت بيع' },
  { v: 'policy', l: 'سياسة' },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.v, c.l]));

export default function TrainingPage() {
  const { push } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    category: 'product',
    title: '',
    content: '',
  });

  async function load() {
    const r = await api<{ items: Item[] }>('/api/training');
    setItems(r.items);
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.content) return;
    await api('/api/training', { method: 'POST', body: JSON.stringify(form) });
    setForm({ category: form.category, title: '', content: '' });
    push('تمت الإضافة ✓', 'success');
    load();
  }

  async function remove(id: number) {
    await api(`/api/training/${id}`, { method: 'DELETE' });
    push('تم الحذف', 'info');
    load();
  }

  async function toggle(it: Item) {
    await api(`/api/training/${it.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: it.active ? 0 : 1 }),
    });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">تدريب الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted">
          أضف معلومات منتجاتك وأسعارك وعروضك وسياساتك. الذكاء يستخدم هذه المعلومات كمصدر
          الحقيقة الوحيد في كل محادثة.
        </p>
      </div>

      <form onSubmit={add} className="card grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <div>
          <label className="label">الفئة</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">العنوان</label>
          <input
            className="input"
            placeholder="مثال: باقات الأسعار"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full">
            <Plus size={16} /> إضافة
          </button>
        </div>
        <div className="md:col-span-3">
          <label className="label">المحتوى</label>
          <textarea
            className="input"
            rows={4}
            placeholder="التفاصيل، السكربت، الأسعار، إلخ…"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>
      </form>

      <div className="grid gap-3">
        {items.map((it) => (
          <div key={it.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="badge bg-panel2 text-gray-300">
                    {CAT_LABEL[it.category] || it.category}
                  </span>
                  <span className="font-semibold">{it.title}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                  {it.content}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(it)}
                  className={`badge px-3 py-1 transition ${
                    it.active
                      ? 'bg-accent text-black'
                      : 'bg-panel2 text-gray-300'
                  }`}
                >
                  {it.active ? 'مفعّل' : 'موقوف'}
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="text-sm text-muted">لا توجد إدخالات تدريب بعد.</p>
        )}
      </div>
    </div>
  );
}
