import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a]">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-widest" style={{ color: '#5F6C4E' }}>
          ARITTH MARKET
        </h1>
        <p className="text-sm text-gray-500 mt-1">Plataforma B2B Industrial</p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'bg-[#242424] border border-[#333] shadow-2xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
          },
        }}
      />

      <p className="mt-6 text-xs text-gray-600 text-center max-w-xs">
        ¿Su empresa no está registrada?{' '}
        <a href="/register" className="underline" style={{ color: '#5F6C4E' }}>
          Solicite acceso aquí
        </a>
      </p>
    </div>
  );
}
