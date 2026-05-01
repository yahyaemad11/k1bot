import { db } from './db.js';
import { s, getAllSettings } from './settings.js';

// ── System prompt: Arabic-first, honest, consultative sales ─────────────────
function buildSystemPrompt(lang = 'ar') {
  const businessName = s('business_name', 'KeyOne');
  const isAr = lang === 'ar';
  const base = isAr
    ? `أنت مساعد ذكي اسمه "${businessName}" على واتساب. أسلوبك مصري/خليجي خفيف، دافئ، مقنع، غير مستعجل.

🎯 هويتك الأساسية (مهم جداً):
- تعرّف بنفسك في أول رسالة فقط وبشكل طبيعي: "أنا مساعد KeyOne الذكي 👋"
- في بقية الردود لا تكرر التعريف، فقط كن لبقاً ومختصراً.
- لا تكذب. إذا سألك العميل "أنت بوت؟" قل: "أيوه أنا مساعد ذكي من فريق KeyOne، بس بمجرد ما تبدي اهتمام هحوّلك للمالك مباشرة يرتب معاك ميتنج."

🛑 قواعد صارمة:
- الرد قصير جداً (سطر أو سطرين كحد أقصى) بنَفَس واتساب طبيعي.
- تحدث بنفس لهجة العميل (عربية فصحى / مصري / خليجي / إنجليزي).
- استخدم "قاعدة المعرفة" أدناه كمصدر الحقيقة الوحيد للأسعار والعروض. لا تخترع سعراً أو ميزة غير موجودة.
- إذا لم تجد معلومة قل: "خليني أتأكد من المالك وأرجع لك فوراً."
- إيموجي واحد كحد أقصى لكل رسالة. لا تكرر نفس الصياغة.

🧠 تصنيف العميل وتخصيص الرد:
- إذا سأل عن **الطريقة/الميثود** (200 كريدت بسعر ثابت، سكربت أوتوميشن، حسابات غير محدودة) → ركّز على التوفير: "بدل ما تدفع كل شوية، تدفع مرة واحدة وتزود زي ما انت عايز."
- إذا سأل عن **باقات كريدت جاهزة** → اعرض الأسعار من قاعدة المعرفة واذكر أن الدفع بعد التفعيل والتسليم فوري.
- إذا سأل "إيه الفرق بينهم؟" → اشرح: الباقات = حل سريع لمرة واحدة، الطريقة = استثمار يوفر على المدى الطويل.
- إذا كان متردد في السعر → قارن: "تخيل لو زودت 10,000 كريدت بباقات عادية... كم هتدفع؟ مع الميثود بتدفع مرة واحدة فقط."

🔥 إغلاق الصفقة (مهم):
- في كل رسالة بعد أول رسالة، لو حسّيت بأي اهتمام (سأل عن سعر/ميزة/طريقة دفع/"مهتم"/"ابعت"/"تمام") اختم بجملة مثل:
  "لو حابب تبدأ، هحوّلك للمالك مباشرة يرتب معاك ميتنج سريع ويجاوبك على كل تفاصيلك 🤝"
- إذا أبدى نية شراء صريحة ("ابعت الرابط" / "تمام نبدأ" / "كيف أدفع") → قل: "تمام، ثانية واحدة بحوّلك للمالك دلوقتي يتواصل معاك شخصياً ويكمل معاك الطلب."

📋 التأهيل الذكي:
- اسأل سؤال واحد فقط في كل رد (مش أكتر):
  • أول رسالة: "أنت مهتم بباقات الكريدت الجاهزة، ولا بالميثود اللي بتوفرلك تزود بنفسك؟"
  • لو اختار باقات: "محتاج كام كريدت تقريباً؟"
  • لو اختار ميثود: "حابب النسخة العادية بـ 250$ ولا الكاملة بأوتوميشن 300$؟"

🚫 لا تفعل:
- لا تعرض كل الأسعار دفعة واحدة. اسأل احتياجه أولاً.
- لا تستخدم Promo Codes أو Events في كلامك — الطريقة شرعية 100٪.
- لا تعد بشيء غير موجود في قاعدة المعرفة.`
    : `You are "${businessName}", a consultative WhatsApp sales assistant. Tone: warm, respectful, empathetic — never robotic or pushy.
Hard rules:
- Reply in the customer's language.
- Keep replies short (1-3 sentences), WhatsApp style.
- Never lie. If the customer directly asks "are you a bot/AI?", be honest that you're an AI assistant working with the sales team, and offer to transfer them to a human right away.
- Use the KNOWLEDGE BASE below as the ONLY source of truth for product, pricing, offers. Never invent facts — if unknown, say "let me check with the team and get back to you."
- Ask ONE smart qualifying question per turn (need, budget, timeline, decision-maker).
- Handle objections with empathy; reframe value, don't argue.
- Move every conversation toward a close: trial, demo booking, or payment link.
- If the customer shows clear buying intent, confirm details and say a sales specialist will finalize within minutes.
- Use at most one emoji per message. Never repeat the same phrasing.`;
  return base;
}

function buildKnowledgeBase() {
  const rows = db
    .prepare(
      "SELECT category, title, content FROM training WHERE active = 1 ORDER BY category, id"
    )
    .all();
  if (!rows.length) return '(قاعدة المعرفة فارغة — رد ردوداً عامة مهذبة واطلب تفاصيل المنتج من الفريق.)';
  return rows.map((r) => `# ${r.category.toUpperCase()} — ${r.title}\n${r.content}`).join('\n\n');
}

function buildMessages(history, userText, lang) {
  const kb = buildKnowledgeBase();
  const buyer = classifyBuyer(userText, history);
  const buyerHint =
    buyer === 'method'
      ? '🔎 تصنيف ذكي: العميل يبدو مهتماً بالميثود (تزويد بنفسه) — لا تسأله "باقات أم ميثود". تكلم مباشرة عن الميثود ومميزاتها.'
      : buyer === 'package'
      ? '🔎 تصنيف ذكي: العميل يبدو مهتماً بباقات الكريدت الجاهزة — لا تسأله "باقات أم ميثود". اذهب مباشرة لسؤال الكمية.'
      : '🔎 تصنيف ذكي: العميل لم يحدد بعد — اطرح سؤال التصنيف الأول.';
  const sys = `${buildSystemPrompt(lang)}\n\n=== قاعدة المعرفة ===\n${kb}\n=== نهاية قاعدة المعرفة ===\n\nلغة المحادثة المكتشفة: ${lang}.\n${buyerHint}`;
  const msgs = [{ role: 'system', content: sys }];
  for (const m of history.slice(-14)) {
    msgs.push({ role: m.direction === 'in' ? 'user' : 'assistant', content: m.body });
  }
  msgs.push({ role: 'user', content: userText });
  return msgs;
}

async function callOpenAICompatible({ baseUrl, apiKey, model, messages }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 320 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

function ruleBasedFallback(userText, lang) {
  const ar = lang === 'ar';
  const t = (userText || '').toLowerCase();
  if (/(price|سعر|كم|بكم|التكلفه|التكلفة)/i.test(t))
    return ar
      ? 'أهلاً فيك 👋 عندنا باقات مرنة تناسب الاحتياج. ممكن تخبرني باختصار وش الي تدور عليه عشان أرشح لك الأنسب؟'
      : "Hey 👋 we've got flexible plans. Could you tell me briefly what you're looking for so I recommend the best fit?";
  if (/(buy|اشتري|أبغى|ابغى|أريد|اريد|احجز|احجزه)/i.test(t))
    return ar
      ? 'تمام! خلني آخذ تفاصيلك السريعة وأحوّلك لأحد مختصي المبيعات عندنا خلال دقائق.'
      : "Awesome! Let me take a couple of quick details and our sales specialist will reach out within minutes.";
  return ar
    ? 'أهلاً وسهلاً 👋 كيف أقدر أساعدك اليوم؟'
    : 'Hey there 👋 how can I help you today?';
}

export async function generateReply({ history, userText, lang }) {
  const provider = s('ai_provider', 'groq');
  const model = s('ai_model', 'llama-3.3-70b-versatile');
  const key = s('ai_api_key', '');
  const messages = buildMessages(history, userText, lang);
  try {
    if (provider === 'groq' && key) {
      return await callOpenAICompatible({
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: key,
        model,
        messages,
      });
    }
    if (provider === 'openai' && key) {
      return await callOpenAICompatible({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: key,
        model: model.includes('llama') ? 'gpt-4o-mini' : model,
        messages,
      });
    }
  } catch (e) {
    console.error('[AI] provider error, falling back:', e.message);
  }
  return ruleBasedFallback(userText, lang);
}

// ── Intent + signal detection ───────────────────────────────────────────────
// DECISIVE = single phrase that immediately means "I'm ready to buy NOW".
// Each one alone trips HOT.
const DECISIVE = [
  'موافق', 'تمام موافق', 'تمام ابعت', 'ابعتلي الرابط', 'ابعتلي رابط',
  'ابعتلى الرابط', 'ابعتلى رابط', 'عايز اشتري', 'عايز ابدأ', 'عايز أبدأ',
  'انا جاهز', 'أنا جاهز', 'جاهز ادفع', 'جاهز للدفع', 'هدفع دلوقتي',
  'ابدأ معاك', 'ابدا معاك', 'ابدأ معاكم', 'يلا نبدأ', 'نبدا',
  'i want to buy', 'lets start', "let's start", 'send me the link', 'ready to pay',
  'i agree', 'agreed', 'deal', 'go ahead',
];
const HOT = [
  'pay', 'payment', 'buy', 'purchase', 'checkout', 'invoice', 'order',
  'send link', 'how to pay', 'reserve', 'confirm', 'subscribe',
  'ادفع', 'الدفع', 'اشتري', 'اشتراك', 'ابغاه', 'أبغاه', 'ابغى', 'أبغى',
  'احجز', 'أحجز', 'ابعت', 'ابعتلي', 'ابعتلى', 'رابط', 'فاتورة', 'تفعيل',
  'اشترك',
];
const WARM = [
  'price', 'cost', 'discount', 'offer', 'demo', 'trial', 'features',
  'سعر', 'تكلفة', 'خصم', 'عرض', 'تجربة', 'مميزات', 'متى', 'كم', 'معلومات',
];

// Wrong-number phrases — STRICT list to avoid false positives.
// Only crystal-clear phrases that almost never appear in normal sales talk.
const WRONG_NUMBER = [
  'wrong number',
  "don't know you",
  "i don't know you",
  'never contacted',
  'رقم غلط',
  'رقم خطأ',
  'اتصلت غلط',
  'ارسلت غلط',
  'بعت غلط',
  'الرقم غلط',
];

// Classify buyer type from current text + history. Returns 'method' | 'package' | 'unknown'.
const METHOD_KW = [
  'ميثود', 'الميثود', 'method', 'طريقة', 'الطريقة',
  'اوتوميشن', 'أوتوميشن', 'automation', 'سكربت', 'script',
  'حسابات', 'unlimited', 'غير محدود', 'بدون حدود',
  'ولّد', 'تزويد', 'تزود بنفسي', 'تزود بنفسك', 'انشاء حسابات',
  '250$', '300$', 'pro', 'برو', 'discord', 'ديسكورد',
];
const PACKAGE_KW = [
  'باقة', 'باقات', 'package', 'الباقة', 'الباقات',
  'بكم', 'كم سعر', 'السعر', 'أسعار', 'اسعار',
  '200 كريدت', '400 كريدت', '600 كريدت', '800 كريدت',
  '1000 كريدت', '2000 كريدت', '5000 كريدت', '10000 كريدت', '10,000',
  'تسليم فوري', 'محتاج كريدت', 'عايز كريدت',
];

export function classifyBuyer(text, history = []) {
  const all =
    (text || '') +
    ' ' +
    history
      .filter((h) => h.direction === 'in')
      .slice(-6)
      .map((h) => h.body)
      .join(' ');
  const t = all.toLowerCase();
  let m = 0,
    p = 0;
  for (const k of METHOD_KW) if (t.includes(k.toLowerCase())) m++;
  for (const k of PACKAGE_KW) if (t.includes(k.toLowerCase())) p++;
  if (m === 0 && p === 0) return 'unknown';
  if (m > p) return 'method';
  if (p > m) return 'package';
  return 'unknown';
}

export function detectIntent(text) {
  const t = (text || '').toLowerCase();
  let score = 0;
  let level = 'cold';
  // Decisive phrases instantly trip HOT — single keyword is enough.
  let decisive = false;
  for (const k of DECISIVE) {
    if (t.includes(k.toLowerCase())) { score += 60; decisive = true; }
  }
  for (const k of HOT) if (t.includes(k)) score += 25;
  for (const k of WARM) if (t.includes(k)) score += 8;
  if (decisive || score >= 40) level = 'hot';
  else if (score >= 12) level = 'warm';
  return { score: Math.min(100, score), level };
}

export function isOptOut(text) {
  const raw = s('optout_keywords', '');
  const keys = raw.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
  const t = (text || '').toLowerCase();
  return keys.some((k) => k && t.includes(k));
}

export function isWrongNumber(text) {
  if (s('wrong_number_enabled', '1') !== '1') return false;
  const raw = (text || '').trim();
  // Wrong-number replies are virtually always SHORT (≤ 60 chars). Long messages
  // mentioning "رقم" likely refer to phone numbers in product talk, not "wrong number".
  if (raw.length > 60) return false;
  const t = raw.toLowerCase();
  return WRONG_NUMBER.some((k) => t.includes(k));
}
