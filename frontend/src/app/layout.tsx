import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Aritth Market | Suministros Industriales B2B',
    template: '%s | Aritth Market',
  },
  description: 'Plataforma B2B de suministros industriales para Zona Franca y empresas en Costa Rica. Cotizaciones instantáneas, entrega ágil.',
  keywords: ['suministros industriales', 'B2B', 'Zona Franca', 'Costa Rica', 'ferretería industrial'],
  authors: [{ name: 'Aritth' }],
  robots: 'noindex, nofollow', // Privado - solo para empresas registradas
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#5F6C4E',
          colorBackground: '#1a1a1a',
          colorInputBackground: '#242424',
          colorText: '#e5e5e5',
          colorTextSecondary: '#888',
          colorInputText: '#e5e5e5',
          borderRadius: '8px',
        },
        elements: {
          card: 'bg-[#242424] border border-[#333]',
          headerTitle: 'text-white',
          socialButtonsBlockButton: 'bg-[#333] border-[#444] text-white hover:bg-[#3a3a3a]',
          formButtonPrimary: 'bg-[#5F6C4E] hover:bg-[#4a5540]',
          footerActionLink: 'text-[#5F6C4E]',
        },
      }}
    >
      <html lang="es" className={inter.variable}>
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
