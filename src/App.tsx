import { useState } from 'react'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { LoginCard } from '@/components/LoginCard'
import { SignupCard } from '@/components/SignupCard'
import { Dashboard } from '@/components/Dashboard'
import { Loader2 } from 'lucide-react'

function AuthView() {
  const { session, isLoading } = useAuth()
  const [currentView, setCurrentView] = useState<'login' | 'signup'>('login')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm font-medium">Verificando sessão de segurança...</span>
      </div>
    )
  }

  // Se já estiver logado, redireciona direto para o Dashboard
  if (session) {
    return <Dashboard />
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/10 via-blue-600/10 to-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Subtle tech grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      ></div>

      <div className="relative z-10 w-full max-w-md">
        {currentView === 'login' ? (
          <LoginCard onNavigateToSignup={() => setCurrentView('signup')} />
        ) : (
          <SignupCard onNavigateToLogin={() => setCurrentView('login')} />
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthView />
    </AuthProvider>
  )
}
