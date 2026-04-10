import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest mb-2" style={{ color: '#5F6C4E' }}>
            ARITTH
          </h1>
          <p className="text-gray-500 text-sm">Crea tu cuenta de empresa</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-[#242424] border border-[#333] shadow-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-[#1a1a1a] border border-[#333] text-white hover:bg-[#333]',
              formFieldInput: 'bg-[#1a1a1a] border-[#333] text-white',
              formFieldLabel: 'text-gray-400',
              footerActionLink: 'text-[#5F6C4E]',
              formButtonPrimary: 'bg-[#5F6C4E] hover:bg-[#4a5540]',
            },
          }}
          redirectUrl="/catalog"
        />
      </div>
    </div>
  );
}
