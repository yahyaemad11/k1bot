'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Save,
  Bell,
  Bot,
  Clock,
  Shield,
  Ban,
  PhoneOff,
  Trash2,
  Plus,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

type Settings = Record<string, string>;

type BlItem = { jid: string; reason: string; created_at: number };

export default function SettingsPage() {
  const { push } = useToast();
  const [s, setS] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bl, setBl] = useState<BlItem[]>([]);
  const [blPhone, setBlPhone] = useState('');

  async function load() {
    setLoading(true);
    const r = await api<{ settings: Settings }>('/api/settings');
    setS(r.settings);
    const b = await api<{ items: BlItem[] }>('/api/settings/blacklist');
    setBl(b.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function upd(k: string, v: string) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      // Do not send empty ai_api_key (so we don't wipe it)
      const patch = { ...s };
      if (!patch.ai_api_key) delete patch.ai_api_key;
      const r = await api<{ settings: Settings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      // Refresh from server (gets new ai_api_key_masked, clears the input).
      setS({ ...r.settings, ai_api_key: '' });
      push('تم حفظ الإعدادات ✓', 'success');
    } catch {
      push('فشل الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addBl() {
    const phone = blPhone.replace(/\D/g, '');
    if (!phone) return;
    await api('/api/settings/blacklist', {
      method: 'POST',
      body: JSON.stringify({ phone, reason: 'manual' }),
    });
    setBlPhone('');
    push('تمت إضافة الرقم للقائمة السوداء', 'info');
    load();
  }

  async function delBl(jid: string) {
    await api(`/api/settings/blacklist/${encodeURIComponent(jid)}`, {
      method: 'DELETE',
    });
    load();
  }

  if (loading) return <div className="text-muted">جاري التحميل…</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإعدادات</h1>
          <p className="text-sm text-muted">
            تحكم كامل في سلوك الذكاء، التنبيهات، وحماية الحساب.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'جاري الحفظ…' : 'حفظ كل الإعدادات'}
        </button>
      </div>

      {/* General */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="text-accent" />
          <h2 className="section-title">التنبيهات والهوية</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">اسم النشاط التجاري</label>
            <input
              className="input"
              value={s.business_name || ''}
              onChange={(e) => upd('business_name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              رقم الأدمن لاستقبال التنبيهات (دولي بدون +)
            </label>
            <input
              className="input font-mono"
              dir="ltr"
              placeholder="9665XXXXXXXX"
              value={s.admin_whatsapp || ''}
              onChange={(e) => upd('admin_whatsapp', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              يصلك تنبيه على هذا الرقم عند وصول عميل ساخن جاهز للإغلاق.
            </p>
          </div>
          <div>
            <label className="label">حد النقاط لتصنيف العميل ساخناً</label>
            <input
              type="number"
              className="input"
              value={s.admin_notify_threshold || '60'}
              onChange={(e) => upd('admin_notify_threshold', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.auto_reply_enabled === '1'}
                onChange={(e) =>
                  upd('auto_reply_enabled', e.target.checked ? '1' : '0')
                }
                className="h-4 w-4 accent-[#22c55e]"
              />
              تفعيل الرد التلقائي بالذكاء الاصطناعي
            </label>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Bot size={18} className="text-accent" />
          <h2 className="section-title">الذكاء الاصطناعي</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">المزوّد</label>
            <select
              className="input"
              value={s.ai_provider || 'groq'}
              onChange={(e) => upd('ai_provider', e.target.value)}
            >
              <option value="groq">Groq (مجاني)</option>
              <option value="openai">OpenAI / متوافق</option>
              <option value="none">معطّل (ردود قاعدية)</option>
            </select>
          </div>
          <div>
            <label className="label">اسم النموذج</label>
            <input
              className="input font-mono"
              dir="ltr"
              value={s.ai_model || ''}
              onChange={(e) => upd('ai_model', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              مثال لـ Groq: <code>llama-3.3-70b-versatile</code> — لـ OpenAI:{' '}
              <code>gpt-4o-mini</code>
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="label flex items-center justify-between">
              <span>مفتاح API (يُحفظ مشفر — اتركه فارغاً لعدم التغيير)</span>
              {s.ai_api_key_masked && (
                <span className="text-xs font-normal text-emerald-400">
                  ✓ مفتاح محفوظ: <span className="font-mono">{s.ai_api_key_masked}</span>
                </span>
              )}
            </label>
            <input
              type="password"
              className="input font-mono"
              dir="ltr"
              placeholder={
                s.ai_api_key_masked
                  ? 'اترك فارغاً للإبقاء على المفتاح الحالي'
                  : 'الصق مفتاح Groq أو OpenAI هنا'
              }
              value={s.ai_api_key || ''}
              onChange={(e) => upd('ai_api_key', e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              احصل على مفتاح Groq مجاني من{' '}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                console.groq.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Business hours */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={18} className="text-accent" />
          <h2 className="section-title">ساعات العمل</h2>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.business_hours_enabled === '1'}
            onChange={(e) =>
              upd('business_hours_enabled', e.target.checked ? '1' : '0')
            }
            className="h-4 w-4 accent-[#22c55e]"
          />
          تفعيل ساعات العمل (خارجها يرسل الذكاء رسالة انتظار فقط)
        </label>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">من الساعة</label>
            <input
              type="time"
              className="input"
              value={s.business_hours_start || '09:00'}
              onChange={(e) => upd('business_hours_start', e.target.value)}
            />
          </div>
          <div>
            <label className="label">إلى الساعة</label>
            <input
              type="time"
              className="input"
              value={s.business_hours_end || '22:00'}
              onChange={(e) => upd('business_hours_end', e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="label">رسالة خارج الدوام</label>
            <textarea
              className="input"
              rows={2}
              value={s.off_hours_message || ''}
              onChange={(e) => upd('off_hours_message', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Anti-ban */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={18} className="text-accent" />
          <h2 className="section-title">حماية الحساب من الحظر</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label">أقل تأخير (ملي ثانية)</label>
            <input
              type="number"
              className="input"
              value={s.min_reply_delay_ms || '2000'}
              onChange={(e) => upd('min_reply_delay_ms', e.target.value)}
            />
          </div>
          <div>
            <label className="label">أعلى تأخير (ملي ثانية)</label>
            <input
              type="number"
              className="input"
              value={s.max_reply_delay_ms || '7000'}
              onChange={(e) => upd('max_reply_delay_ms', e.target.value)}
            />
          </div>
          <div>
            <label className="label">سرعة الكتابة (حرف/ثانية)</label>
            <input
              type="number"
              className="input"
              value={s.typing_chars_per_sec || '16'}
              onChange={(e) => upd('typing_chars_per_sec', e.target.value)}
            />
          </div>
          <div>
            <label className="label">حد الرسائل/دقيقة لكل عميل</label>
            <input
              type="number"
              className="input"
              value={s.max_messages_per_minute || '10'}
              onChange={(e) => upd('max_messages_per_minute', e.target.value)}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          هذه القيم تحاكي كتابة إنسان حقيقي. لا تنزلها لأقل من 1000 مللي ثانية.
        </p>
      </section>

      {/* Wrong number + opt-out */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <PhoneOff size={18} className="text-accent" />
          <h2 className="section-title">الرقم الغلط وإيقاف الرسائل</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.wrong_number_enabled === '1'}
                onChange={(e) =>
                  upd('wrong_number_enabled', e.target.checked ? '1' : '0')
                }
                className="h-4 w-4 accent-[#22c55e]"
              />
              كشف الرقم الغلط تلقائياً (عبارات: "مش أنا"، "رقم غلط"، إلخ)
            </label>
            <div className="mt-3">
              <label className="label">رد الرقم الغلط</label>
              <textarea
                className="input"
                rows={3}
                value={s.wrong_number_reply || ''}
                onChange={(e) => upd('wrong_number_reply', e.target.value)}
              />
            </div>
          </div>
          <div>
            <div>
              <label className="label">كلمات طلب إيقاف الرسائل (مفصولة بفاصلة)</label>
              <input
                className="input"
                value={s.optout_keywords || ''}
                onChange={(e) => upd('optout_keywords', e.target.value)}
              />
            </div>
            <div className="mt-3">
              <label className="label">رد تأكيد إيقاف الرسائل</label>
              <textarea
                className="input"
                rows={3}
                value={s.optout_reply || ''}
                onChange={(e) => upd('optout_reply', e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blacklist */}
      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Ban size={18} className="text-accent" />
          <h2 className="section-title">القائمة السوداء</h2>
        </div>
        <p className="text-xs text-muted">
          الأرقام هنا لن يرد عليها النظام مطلقاً. يتم إضافة الأرقام تلقائياً عند
          طلب الإيقاف أو كشف رقم غلط.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="input max-w-xs font-mono"
            dir="ltr"
            placeholder="مثال: 9665XXXXXXXX"
            value={blPhone}
            onChange={(e) => setBlPhone(e.target.value)}
          />
          <button onClick={addBl} className="btn-ghost">
            <Plus size={16} /> إضافة
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {bl.map((b) => (
            <div
              key={b.jid}
              className="flex items-center justify-between rounded-xl border border-border bg-panel2 p-2.5 text-sm"
            >
              <div>
                <span className="font-mono" dir="ltr">
                  +{b.jid.split('@')[0]}
                </span>
                <span className="mr-3 text-xs text-muted">({b.reason})</span>
              </div>
              <button
                onClick={() => delBl(b.jid)}
                className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!bl.length && (
            <p className="text-sm text-muted">القائمة فارغة.</p>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={16} /> {saving ? 'جاري الحفظ…' : 'حفظ كل الإعدادات'}
        </button>
      </div>
    </div>
  );
}
