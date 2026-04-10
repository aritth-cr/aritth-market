'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  FileText,
  User,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/catalog', label: 'Catálogo', icon: Package },
  { href: '/quotes', label: 'Cotizaciones', icon: FileText },
  { href: '/orders', label: 'Órdenes', icon: ShoppingCart },
  { href: '/profile', label: 'Mi Empresa', icon: User },
];

interface ClientLayoutProps {
  children: React.ReactNode;
  cartCount?: number;
}

export function ClientLayout({ children, cartCount = 0 }: ClientLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* ---- NAVBAR ---- */}
      <header className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/catalog" className="flex-shrink-0">
            <span
              className="text-xl font-bold tracking-widest"
              style={{ color: '#5F6C4E' }}
            >
              AMT
            </span>
          </Link>

          {/* Búsqueda */}
          <div className="flex-1 max-w-lg mx-auto relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar productos... (ej: sargentos, cable 12AWG)"
              className="w-full bg-[#242424] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5F6C4E] transition-colors"
            />
          </div>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith(item.href)
                    ? 'bg-[#5F6C4E]/20 text-[#5F6C4E]'
                    : 'text-gray-400 hover:text-white hover:bg-[#242424]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Carrito */}
            <Link href="/cart" className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-[#F97316] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Notificaciones */}
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            {/* User */}
            <UserButton afterSignOutUrl="/sign-in" />

            {/* Mobile menu */}
            <button
              className="lg:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#242424] border-b border-[#333] lg:hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {/* Mobile search */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5F6C4E]"
                />
              </div>
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    pathname.startsWith(item.href)
                      ? 'bg-[#5F6C4E]/20 text-[#5F6C4E]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] border-t border-[#333] py-4 text-center">
 