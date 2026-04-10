'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  FileText,
  TrendingUp,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/invoices', label: 'Facturas', icon: FileText },
  { href: '/finance', label: 'Finanzas', icon: TrendingUp },
  { href: '/scraping', label: 'Scraping', icon: RefreshCw },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const currentNav = NAV_ITEMS.find(item => isActive(item.href));

  return (
    <div className="min-h-screen bg-[#111] flex">

      {/* ---- SIDEBAR DESKTOP ---- */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1a1a1a] border-r border-[#2a2a2a] flex-shrink-0 fixed top-0 left-0 h-full z-30">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2a2a2a]">
          <div className="w-8 h-8 rounded-lg bg-[#5F6C4E] flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-widest text-white">AMT</span>
            <p className="text-[10px] text-gray-500 leading-none">Back Office</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-[#5F6C4E]/20 text-[#8fa06e]'
                    : 'text-gray-500 hover:text-white hover:bg-[#242424]'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#8fa06e]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-[#8fa06e]" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-4 py-4 border-t border-[#2a2a2a] flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 truncate">Panel interno</p>
            <p className="text-[10px] text-gray-600">Aritth Market</p>
          </div>
        </div>
      </aside>

      {/* ---- MOBILE OVERLAY ---- */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-60 z-50 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col lg:hidden"
            >
              {/* Logo */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#5F6C4E] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-widest text-white">AMT</span>
                    <p className="text-[10px] text-gray-500 leading-none">Back Office</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#5F6C4E]/20 text-[#8fa06e]'
                          : 'text-gray-500 hover:text-white hover:bg-[#242424]'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${active ? 'text-[#8fa06e]' : 'text-gray-600'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="px-4 py-4 border-t border-[#2a2a2a] flex items-center gap-3">
                <UserButton afterSignOutUrl="/sign-in" />
                <p className="text-xs text-gray-500">Panel interno</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---- MAIN AREA ---- */}
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">

        {/* Topbar (mobile + breadcrumb) */}
        <header className="sticky top-0 z-20 bg-[#111]/95 backdrop-blur border-b border-[#1e1e1e] h-14 flex items-center px-4 gap-3">

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 text-gray-500 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2">
            <span className="text-sm font-bold tracking-widest text-white">AMT</span>
            <span className="text-[10px] text-gray-500">Back Office</span>
          </Link>

          {/* Breadcrumb / active section (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            {currentNav && (
              <div className="flex items-center gap-2 text-gray-400">
                <currentNav.icon className="w-4 h-4 text-gray-600" />
                <span>{currentNav.label}</span>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* Admin badge */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-[#5F6C4E]/15 text-[#8fa06e] text-[10px] font-medium tracking-wide uppercase">
              <Shield className="w-3 h-3" />
              Admin
            </span>
            {/* User (desktop — ya está en sidebar, aquí solo mobile context) */}
            <div className="lg:hidden">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1e1e1e] py-3 