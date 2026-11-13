import { NEON_AUTH_BASE_URL, sql } from './db'

export interface UserSession {
  user: {
    id: string
    name: string
    email: string
    image?: string
    emailVerified?: boolean
    createdAt?: string
    updatedAt?: string
  }
  session: {
    id: string
    userId: string
    expiresAt: string
    token: string
    createdAt?: string
    updatedAt?: string
  }
  tecnico?: {
    id: string
    nome: string
    email: string
    nivel_acesso: string
  }
}

const STORAGE_SESSION_KEY = 'rctech_auth_session'

export const authClient = {
  getSavedSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as UserSession
      if (parsed?.session?.expiresAt) {
        const expires = new Date(parsed.session.expiresAt).getTime()
        if (Date.now() > expires) {
          localStorage.removeItem(STORAGE_SESSION_KEY)
          return null
        }
      }
      return parsed
    } catch {
      return null
    }
  },

  saveSession(sessionData: UserSession) {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData))
  },

  clearSession() {
    localStorage.removeItem(STORAGE_SESSION_KEY)
  },

  async signUp({ name, email, password }: { name: string; email: string; password: string }) {
    // 1. Chamar Neon Auth (better-auth endpoint)
    const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      const errorMsg = errData?.message || errData?.error || 'Erro ao realizar cadastro.'
      throw new Error(errorMsg)
    }

    const data = await res.json()

    // 2. Sincronizar na tabela 'tecnicos'
    let tecnicoData = null
    try {
      const existing = await sql`SELECT id, nome, email, nivel_acesso FROM tecnicos WHERE email = ${email} LIMIT 1`
      if (existing && existing.length > 0) {
        tecnicoData = existing[0]
      } else {
        const inserted = await sql`
          INSERT INTO tecnicos (nome, email, nivel_acesso)
          VALUES (${name}, ${email}, 'tecnico_campo')
          RETURNING id, nome, email, nivel_acesso
        `
        tecnicoData = inserted[0]
      }
    } catch (dbErr) {
      console.warn('Erro ao salvar na tabela tecnicos:', dbErr)
    }

    const fullSession: UserSession = {
      ...data,
      tecnico: tecnicoData,
    }

    this.saveSession(fullSession)
    return fullSession
  },

  async signIn({ email, password }: { email: string; password: string }) {
    const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      const message = errData?.message || errData?.error || ''
      if (res.status === 401 || res.status === 400 || message.toLowerCase().includes('credential') || message.toLowerCase().includes('invalid')) {
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
      throw new Error(message || 'Credenciais inválidas. Verifique seu e-mail e senha.')
    }

    const data = await res.json()

    // Buscar dados do técnico
    let tecnicoData = null
    try {
      const existing = await sql`SELECT id, nome, email, nivel_acesso FROM tecnicos WHERE email = ${email} LIMIT 1`
      if (existing && existing.length > 0) {
        tecnicoData = existing[0]
      } else {
        const inserted = await sql`
          INSERT INTO tecnicos (nome, email, nivel_acesso)
          VALUES (${data?.user?.name || email}, ${email}, 'tecnico_campo')
          RETURNING id, nome, email, nivel_acesso
        `
        tecnicoData = inserted[0]
      }
    } catch (dbErr) {
      console.warn('Erro ao carregar dados do técnico:', dbErr)
    }

    const fullSession: UserSession = {
      ...data,
      tecnico: tecnicoData,
    }

    this.saveSession(fullSession)
    return fullSession
  },

  async signOut() {
    try {
      await fetch(`${NEON_AUTH_BASE_URL}/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch(() => null)
    } finally {
      this.clearSession()
    }
  },

  async getSession(): Promise<UserSession | null> {
    const local = this.getSavedSession()
    if (!local) return null

    try {
      const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (res.ok) {
        const serverData = await res.json()
        if (serverData && serverData.session) {
          const updated: UserSession = {
            ...serverData,
            tecnico: local.tecnico,
          }
          this.saveSession(updated)
          return updated
        }
      }
    } catch {
      // Fallback para o session em localStorage se offline ou proxy
    }

    return local
  },
}

