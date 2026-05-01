'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Send, UserCog, Bot, ExternalLink, Trash2, Eraser } from 'lucide-react';
import { useToast } from '@/components/Toast';

type Lead = {
  id: number;
  jid: string;
  phone: string;
  name: string | null;
  status: string;
  score: number;
  takeover: number;
  notes?: string | null;
};

type Message = {
  id: number;
  direction: 'in' | 'out';
  sender: string;
  body: string;
  created_at: number;
};

const STATUS_AR: Record<string, string> = {
  cold: 'بارد',
  warm: 'دافئ',
  hot: 'ساخن',
  closed: 'تم البيع',
  lost: 'مفقود',
};

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted">جارٍ التحميل…</div>}>
      <ChatsPageInner />
    </Suspense>
  );
}

function ChatsPageInner() {
  const params = useSearchParams();
  const initialLead = params.get('lead');
  const { push } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<number | null>(
    initialLead ? parseInt(initialLead, 10) : null
  );
  const [active, setActive] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function loadLeads() {
    const res = await api<{ leads: Lead[] }>('/api/leads');
    setLeads(res.leads);
    if (!activeId && res.leads[0]) setActiveId(res.leads[0].id);
  }

  async function loadConversation(id: number) {
    const res = await api<{ lead: Lead; messages: Message[] }>(
      `/api/leads/${id}`
    );
    setActive(res.lead);
    setMessages(res.messages);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (activeId) loadConversation(activeId);
  }, [activeId]);

  useEffect(() => {
    const s = getSocket();
    const onMsg = (m: any) => {
      if (m.leadId === activeId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            direction: m.direction,
            sender: m.direction === 'in' ? 'customer' : 'ai',
            body: m.body,
            created_at: Math.floor(Date.now() / 1000),
          },
        ]);
        setTimeout(
          () => endRef.current?.scrollIntoView({ behavior: 'smooth' }),
          50
        );
      }
      loadLeads();
    };
    const onLead = () => loadLeads();
    s.on('message:new', onMsg);
    s.on('lead:update', onLead);
    return () => {
      s.off('message:new', onMsg);
      s.off('lead:update', onLead);
    };
  }, [activeId]);

  async function sendReply() {
    if (!active || !text.trim()) return;
    try {
      await api(`/api/leads/${active.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setText('');
    } catch {
      push('تعذر إرسال الرسالة', 'error');
    }
  }

  async function toggleTakeover() {
    if (!active) return;
    await api(`/api/leads/${active.id}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ on: !active.takeover }),
    });
    push(active.takeover ? 'عاد الذكاء للردود التلقائية' : 'تم الاستلام اليدوي', 'info');
    loadConversation(active.id);
  }

  async function setStatus(status: string) {
    if (!active) return;
    await api(`/api/leads/${active.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadConversation(active.id);
    loadLeads();
  }

  async function clearMessages() {
    if (!active) return;
    if (!confirm('سيتم مسح كل رسائل هذه المحادثة (تبقى بيانات العميل). هل أنت متأكد؟')) return;
    try {
      await api(`/api/leads/${active.id}/messages`, { method: 'DELETE' });
      setMessages([]);
      push('تم مسح الرسائل', 'success');
      loadLeads();
    } catch {
      push('تعذر مسح الرسائل', 'error');
    }
  }

  async function deleteLead() {
    if (!active) return;
    if (!confirm(`سيتم حذف المحادثة بالكامل مع +${active.phone} نهائياً. هل أنت متأكد؟`)) return;
    try {
      await api(`/api/leads/${active.id}`, { method: 'DELETE' });
      push('تم حذف المحادثة', 'success');
      const remaining = leads.filter((l) => l.id !== active.id);
      setActive(null);
      setMessages([]);
      setActiveId(remaining[0]?.id ?? null);
      loadLeads();
    } catch {
      push('تعذر حذف المحادثة', 'error');
    }
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 md:h-[calc(100vh-3rem)] md:grid-cols-[260px_1fr_280px]">
      {/* Conversations list — collapsible on mobile (hidden when a chat is active) */}
      <div className={`card overflow-y-auto p-0 ${active ? 'hidden md:block' : ''}`}>
        <div className="border-b border-border p-3 font-semibold">المحادثات</div>
        {leads.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveId(l.id)}
            className={`flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-right text-sm transition hover:bg-panel2 ${
              activeId === l.id ? 'bg-panel2' : ''
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-medium">{l.name || `+${l.phone}`}</span>
              <span className="text-xs text-muted">{STATUS_AR[l.status]}</span>
            </div>
            <span className="font-mono text-xs text-muted" dir="ltr">
              +{l.phone}
            </span>
          </button>
        ))}
        {!leads.length && (
          <p className="p-4 text-sm text-muted">لا محادثات بعد.</p>
        )}
      </div>

      {/* Chat window */}
      <div className={`card flex flex-col p-0 ${!active ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            {active && (
              <button
                onClick={() => { setActive(null); setActiveId(null); }}
                className="rounded-lg border border-border bg-panel2/60 p-1.5 text-muted hover:text-white md:hidden"
                aria-label="رجوع"
              >→</button>
            )}
            <div>
            <div className="font-semibold">
              {active?.name || (active ? `+${active.phone}` : 'اختر محادثة')}
            </div>
            {active && (
              <div className="text-xs text-muted">
                نقاط: {active.score} · الحالة: {STATUS_AR[active.status] || active.status}
              </div>
            )}
            </div>
          </div>
          {active && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleTakeover}
                className={`btn text-xs ${
                  active.takeover
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'btn-ghost'
                }`}
              >
                {active.takeover ? (
                  <>
                    <Bot size={14} /> استئناف الذكاء
                  </>
                ) : (
                  <>
                    <UserCog size={14} /> استلام يدوي
                  </>
                )}
              </button>
              <button
                onClick={clearMessages}
                title="مسح الرسائل فقط"
                className="rounded-xl border border-border p-2 text-amber-300 transition hover:bg-amber-500/10"
              >
                <Eraser size={15} />
              </button>
              <button
                onClick={deleteLead}
                title="حذف المحادثة بالكامل"
                className="rounded-xl border border-red-500/30 p-2 text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-bg/40 p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                m.direction === 'in'
                  ? 'bg-panel2'
                  : 'ml-auto bg-accent text-black'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div
                className={`mt-1 text-[10px] ${
                  m.direction === 'in' ? 'text-muted' : 'text-black/60'
                }`}
              >
                {m.sender === 'customer'
                  ? 'العميل'
                  : m.sender === 'ai'
                  ? 'الذكاء'
                  : m.sender === 'admin'
                  ? 'المالك'
                  : m.sender}{' '}
                · {new Date(m.created_at * 1000).toLocaleTimeString('ar')}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {active && (
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="اكتب رداً يدوياً…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
              />
              <button onClick={sendReply} className="btn-primary">
                <Send size={16} className="flip-rtl" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              ننصحك بتفعيل "الاستلام اليدوي" قبل الرد لتجنب تداخل رسائل الذكاء.
            </p>
          </div>
        )}
      </div>

      {/* Customer panel — hidden on mobile (data shown inline in chat header) */}
      <div className="card hidden md:block">
        <h3 className="section-title">بيانات العميل</h3>
        {active ? (
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <div className="label">الرقم</div>
              <div className="font-mono" dir="ltr">
                +{active.phone}
              </div>
            </div>
            <div>
              <div className="label">الحالة</div>
              <div className="flex flex-wrap gap-2">
                {['cold', 'warm', 'hot', 'closed', 'lost'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(st)}
                    className={`badge px-3 py-1 transition ${
                      active.status === st
                        ? 'bg-accent text-black font-semibold'
                        : 'bg-panel2 text-gray-300 hover:bg-panel'
                    }`}
                  >
                    {STATUS_AR[st]}
                  </button>
                ))}
              </div>
            </div>
            <a
              href={`https://wa.me/${active.phone}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost w-full justify-center text-sm"
            >
              <ExternalLink size={14} className="flip-rtl" /> فتح في واتساب
            </a>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">اختر محادثة لعرض بياناتها.</p>
        )}
      </div>
    </div>
  );
}
