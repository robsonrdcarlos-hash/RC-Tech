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
      if (
        message.toLowerCase().includes('password') ||
        message.toLowerCase().includes('credential') ||
        (message.toLowerCase().includes('email') && (message.toLowerCase().includes('not found') || message.toLowerCase().includes('invalid')))
      ) {
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
      if (message) {
        throw new Error(message)
      }
      if (res.status === 401) {
        throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
      throw new Error(`Erro ao conectar ao serviço de autenticação (${res.status}).`)
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
          let currentTecnico = local.tecnico
          const email = serverData.user?.email || local.user?.email
          if (email) {
            try {
              const rows = await sql`
                SELECT id, nome, email, nivel_acesso 
                FROM tecnicos 
                WHERE email = ${email} 
                LIMIT 1
              `
              if (rows && rows.length > 0) {
                currentTecnico = rows[0] as any
              }
            } catch (err) {
              console.warn('Erro ao atualizar papel do técnico em getSession:', err)
            }
          }

          const updated: UserSession = {
            ...serverData,
            tecnico: currentTecnico,
          }
          this.saveSession(updated)
          return updated
        }
      }
    } catch {
      // Fallback para o session em localStorage se offline ou proxy
    }

    // Mesmo com fallback de rede do better-auth, sincroniza dados do técnico se possível
    if (local?.user?.email) {
      try {
        const rows = await sql`
          SELECT id, nome, email, nivel_acesso 
          FROM tecnicos 
          WHERE email = ${local.user.email} 
          LIMIT 1
        `
        if (rows && rows.length > 0) {
          local.tecnico = rows[0] as any
          this.saveSession(local)
        }
      } catch {
        // silencioso
      }
    }

    return local
  },

  async adminCreateUser({
    name,
    email,
    password,
    nivel_acesso,
  }: {
    name: string
    email: string
    password: string
    nivel_acesso: string
  }) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rc-techinfo.vercel.app'
    
    // 1. Cria usuário no Neon Auth (Better Auth) sem sobrescrever sessão atual
    const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
      },
      credentials: 'omit',
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => null)
      if (errData?.code === 'USER_ALREADY_EXISTS' || errData?.message?.toLowerCase().includes('already exists')) {
        throw new Error('Este e-mail já está cadastrado no sistema.')
      }
      throw new Error(errData?.message || errData?.error || 'Erro ao registrar credenciais de autenticação.')
    }

    // 2. Insere ou atualiza na tabela tecnicos com a função atribuída
    const existing = await sql`SELECT id FROM tecnicos WHERE email = ${email} LIMIT 1`
    let tecnicoData
    if (existing && existing.length > 0) {
      const updated = await sql`
        UPDATE tecnicos 
        SET nome = ${name}, nivel_acesso = ${nivel_acesso}
        WHERE email = ${email}
        RETURNING id, nome, email, nivel_acesso, created_at
      `
      tecnicoData = updated[0]
    } else {
      const inserted = await sql`
        INSERT INTO tecnicos (nome, email, nivel_acesso)
        VALUES (${name}, ${email}, ${nivel_acesso})
        RETURNING id, nome, email, nivel_acesso, created_at
      `
      tecnicoData = inserted[0]
    }

    return tecnicoData
  },

  async adminUpdateUserRole(userId: string, newRole: string) {
    const updated = await sql`
      UPDATE tecnicos 
      SET nivel_acesso = ${newRole}
      WHERE id = ${userId}
      RETURNING id, nome, email, nivel_acesso, created_at
    `
    return updated[0]
  },

  async adminDeleteUser(userId: string, email?: string) {
    // Remove da tabela tecnicos
    await sql`DELETE FROM tecnicos WHERE id = ${userId}`

    // Se tiver email, remove também do neon_auth
    if (email) {
      try {
        await sql`DELETE FROM neon_auth.user WHERE email = ${email}`
      } catch (err) {
        console.warn('Aviso: neon_auth.user limpeza:', err)
      }
    }
  },
}

