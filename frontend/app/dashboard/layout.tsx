'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Brain,
  QrCode,
  LogOut,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { clearToken, getToken } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'العملاء', icon: Users },
  { href: '/dashboard/chats', label: 'المحادثات', icon: MessageSquare },
  { href: '/dashboard/training', label: 'تدريب الذكاء', icon: Brain },
  { href: '/dashboard/connect', label: 'ربط واتساب', icon: QrCode },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  // Close sidebar on route change (mobile UX)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  const Brand = (
    <Link
      href="/dashboard"
      className="group flex items-center gap-3 px-2 py-4"
    >
      <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-accent3/30 bg-black shadow-glow-sm transition group-hover:shadow-glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/k1-logo.svg" alt="K1" className="h-full w-full" />
      </span>
      <div className="leading-tight">
        <div className="text-base font-bold text-white glow-text">KeyOne</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent3/80">
          AI Sales OS
        </div>
      </div>
    </Link>
  );

  const Nav = (
    <nav className="mt-4 space-y-1">
      {nav.map((n) => {
        const Icon = n.icon;
        const active =
          pathname === n.href ||
          (n.href !== '/dashboard' && pathname?.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              active
                ? 'bg-gradient-to-l from-accent/20 via-accent/10 to-transparent text-white font-semibold shadow-glow-sm'
                : 'text-gray-400 hover:text-white hover:bg-panel2/60'
            }`}
          >
            {active && (
              <span className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full bg-accent shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            )}
            <Icon
              size={17}
              className={active ? 'text-accent' : 'text-muted group-hover:text-accent3'}
            />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const Footer = (
    <div className="mt-auto pt-6">
      <button
        onClick={logout}
        className="flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOut size={16} /> خروج
      </button>
      <p className="mt-3 px-2 text-[10px] text-muted/60">© KeyOne · v1.0</p>
    </div>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[270px_1fr]">
      {/* ─── Mobile top bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-panel/70 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-accent3/30 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/k1-logo.svg" alt="K1" className="h-full w-full" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">KeyOne</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent3/80">
              AI Sales OS
            </div>
          </div>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="rounded-lg border border-border bg-panel2/60 p-2 text-accent3 hover:bg-panel2"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ─── Mobile drawer overlay ───────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ─── Sidebar (desktop static + mobile drawer) ───────────── */}
      <aside
        className={`fixed inset-y-0 right-0 z-[60] flex w-[280px] flex-col border-l border-border/60 bg-panel/95 p-4 backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 md:bg-panel/40 ${
          open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Vertical neon line accent */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-accent/40 to-transparent md:block" />

        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          aria-label="إغلاق القائمة"
          className="absolute left-3 top-3 rounded-lg border border-border bg-panel2/60 p-2 text-muted hover:text-white md:hidden"
        >
          <X size={18} />
        </button>

        {Brand}
        {Nav}
        {Footer}
      </aside>

      <main className="fade-in p-4 md:p-6">{children}</main>
    </div>
  );
}
