'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  MessageCircle,
  Flame,
  ShieldCheck,
  Sparkles,
  BarChart3,
  ArrowLeft,
  Lock,
} from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'ذكاء اصطناعي حقيقي',
    desc: 'يفهم كلام العميل بالعربي والإنجليزي، يرد بذكاء، يعالج الاعتراضات، ويدفع نحو إتمام الصفقة.',
  },
  {
    icon: MessageCircle,
    title: 'أتمتة واتساب',
    desc: 'تكامل مباشر مع واتساب بزنس مع محاكاة كتابة بشرية وتأخير ذكي لحماية الحساب.',
  },
  {
    icon: Flame,
    title: 'تنبيهات العملاء الساخنين',
    desc: 'يرصد نية الشراء ويرسل لك تنبيهاً فورياً على واتساب: "🔥 عميل جاهز للإغلاق".',
  },
  {
    icon: ShieldCheck,
    title: 'حماية من الحظر',
    desc: 'معدلات إرسال ذكية، تنويع الصياغة، كشف الرقم الغلط، احترام طلبات إيقاف الرسائل.',
  },
  {
    icon: Sparkles,
    title: 'تدريب مخصص',
    desc: 'غذّيه بمنتجاتك وأسعارك وعروضك وسكربتات البيع. يتعلم فوراً ويتحدث بأسلوبك.',
  },
  {
    icon: BarChart3,
    title: 'لوحة تحكم احترافية',
    desc: 'إدارة العملاء، المحادثات، التحليلات، التدريب، والإعدادات — كل شيء في مكان واحد.',
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-black text-lg">
            K1
          </span>
          <span className="text-lg">KeyOne</span>
        </div>
        <Link href="/login" className="btn-primary text-sm">
          <Lock size={16} /> دخول المالك
        </Link>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-panel/70 px-4 py-1.5 text-xs text-gray-300"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          النظام يعمل على مدار الساعة بأمان
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-5xl font-bold leading-[1.2] md:text-6xl"
        >
          مساعد مبيعاتك الذكي على{' '}
          <span className="bg-gradient-to-l from-accent to-emerald-300 bg-clip-text text-transparent">
            واتساب
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted"
        >
          يحادث عملاءك بذكاء إنسان محترف، يفهم احتياجهم، يعالج اعتراضاتهم،
          ويُنبهك اللحظة التي يصبح فيها العميل جاهزاً للشراء.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Link href="/login" className="btn-primary">
            <Lock size={18} /> الدخول إلى لوحة التحكم
            <ArrowLeft size={18} />
          </Link>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card transition hover:border-accent/40"
              >
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="card bg-gradient-to-bl from-accent/10 to-transparent text-center">
          <h2 className="text-3xl font-bold">
            نظام خاص بك — لا تسجيل، لا اشتراكات.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            مالك واحد، مفتاح واحد، تحكم كامل. كل الأدوات جاهزة لتغلق صفقاتك بذكاء.
          </p>
          <Link href="/login" className="btn-primary mt-6 inline-flex">
            ادخل الآن <ArrowLeft size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} KeyOne — مبني بتقنيات مفتوحة المصدر.
      </footer>
    </main>
  );
}
