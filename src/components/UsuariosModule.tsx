import React, { useState, useEffect, useCallback } from 'react'
import { sql } from '@/lib/db'
import { authClient } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  X,
  Loader2,
  KeyRound
} from 'lucide-react'

export interface UsuarioTecnico {
  id: string
  nome: string
  email: string
  nivel_acesso: string
  created_at: string | null
}

export const UsuariosModule: React.FC = () => {
  const { session } = useAuth()
  const currentUserEmail = session?.user?.email || session?.tecnico?.email

  const [usuarios, setUsuarios] = useState<UsuarioTecnico[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal de Cadastro
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoNivelAcesso, setNovoNivelAcesso] = useState('tecnico_campo')
  const [novaSenha, setNovaSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSummary, setCreatedSummary] = useState<{
    nome: string
    email: string
    senha: string
    nivel: string
  } | null>(null)

  // Modal de Edição de Papel
  const [editingUser, setEditingUser] = useState<UsuarioTecnico | null>(null)
  const [editRole, setEditRole] = useState('')
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)

  // Modal de Exclusão
  const [deletingUser, setDeletingUser] = useState<UsuarioTecnico | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carregar lista de usuários
  const loadUsuarios = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT id, nome, email, nivel_acesso, created_at 
        FROM tecnicos 
        ORDER BY created_at DESC NULLS LAST, nome ASC
      `
      setUsuarios(data as UsuarioTecnico[])
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      setErrorBanner('Erro ao carregar lista de usuários: ' + (err.message || 'Erro de conexão'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadUsuarios()
  }, [loadUsuarios])

  // Gerador de senha forte aleatória
  const gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let pass = ''
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNovaSenha(pass)
  }

  // Handler de Cadastro
  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha) {
      setErrorBanner('Preencha todos os campos obrigatórios.')
      return
    }

    if (novaSenha.length < 6) {
      setErrorBanner('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    try {
      setIsSubmitting(true)
      await authClient.adminCreateUser({
        name: novoNome.trim(),
        email: novoEmail.trim().toLowerCase(),
        password: novaSenha,
        nivel_acesso: novoNivelAcesso,
      })

      setCreatedSummary({
        nome: novoNome.trim(),
        email: novoEmail.trim().toLowerCase(),
        senha: novaSenha,
        nivel: novoNivelAcesso,
      })

      setSuccessBanner(`Usuário ${novoNome.trim()} cadastrado com sucesso no sistema!`)
      await loadUsuarios()

      // Limpar formulário
      setNovoNome('')
      setNovoEmail('')
      setNovaSenha('')
      setNovoNivelAcesso('tecnico_campo')
    } catch (err: any) {
      setErrorBanner(err.message || 'Erro ao cadastrar novo usuário.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler de Atualização de Nível
  const handleAtualizarRole = async () => {
    if (!editingUser) return
    try {
      setIsUpdatingRole(true)
      await authClient.adminUpdateUserRole(editingUser.id, editRole)
      setSuccessBanner(`Permissão de ${editingUser.nome} atualizada para ${getRoleLabel(editRole)}.`)
      setEditingUser(null)
      await loadUsuarios()
    } catch (err: any) {
      setErrorBanner(err.message || 'Erro ao alterar permissão do usuário.')
    } finally {
      setIsUpdatingRole(false)
    }
  }

  // Handler de Exclusão
  const handleConfirmarExclusao = async () => {
    if (!deletingUser) return
    try {
      setIsDeleting(true)
      await authClient.adminDeleteUser(deletingUser.id, deletingUser.email)
      setSuccessBanner(`Usuário ${deletingUser.nome} foi removido da equipe.`)
      setDeletingUser(null)
      await loadUsuarios()
    } catch (err: any) {
      setErrorBanner(err.message || 'Erro ao excluir usuário.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Rótulos e badges por nível de acesso
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'tecnico_campo':
        return 'Técnico de Campo'
      case 'suporte_bancada':
        return 'Suporte de Bancada'
      case 'atendente':
        return 'Atendimento / Comercial'
      default:
        return role || 'Técnico'
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Administrador
          </span>
        )
      case 'tecnico_campo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            Técnico de Campo
          </span>
        )
      case 'suporte_bancada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            Suporte Bancada
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {role || 'Colaborador'}
          </span>
        )
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const q = searchTerm.toLowerCase()
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      getRoleLabel(u.nivel_acesso).toLowerCase().includes(q)
    )
  })

  const totalAdmins = usuarios.filter((u) => u.nivel_acesso === 'admin').length
  const totalTecnicos = usuarios.filter((u) => u.nivel_acesso === 'tecnico_campo').length

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Header da Tela */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Controle de Acessos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Gestão de Usuários & Técnicos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre novos colaboradores e gerencie os níveis de permissão da equipe técnica.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadUsuarios()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar usuários"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setIsModalOpen(true)
              setCreatedSummary(null)
              setErrorBanner(null)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Banners de Notificação */}
      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Métricas / Cards Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Usuários</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{usuarios.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Colaboradores ativos no sistema</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Administradores</p>
              <h3 className="text-3xl font-extrabold text-amber-400 mt-1">{totalAdmins}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Permissão total e criação de contas</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Técnicos de Campo</p>
              <h3 className="text-3xl font-extrabold text-cyan-400 mt-1">{totalTecnicos}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Operação de OS, visitas e laudos</p>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Exibindo {filteredUsuarios.length} de {usuarios.length} registros
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando usuários do Neon Database...</span>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-white">Nenhum usuário encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar o termo da busca ou cadastre um novo colaborador.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Colaborador</th>
                  <th className="py-3.5 px-6">E-mail Corporativo</th>
                  <th className="py-3.5 px-6">Nível de Acesso</th>
                  <th className="py-3.5 px-6">Data de Cadastro</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsuarios.map((u) => {
                  const isCurrent = u.email.toLowerCase() === currentUserEmail?.toLowerCase()
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center text-xs">
                            {u.nome
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{u.nome}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                Você (Sessão Atual)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-mono text-xs">{u.email}</td>
                      <td className="py-4 px-6">{getRoleBadge(u.nivel_acesso)}</td>
                      <td className="py-4 px-6 text-slate-400 text-xs font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '--/--'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u)
                              setEditRole(u.nivel_acesso)
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                            title="Editar nível de acesso"
                          >
                            Alterar Papel
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Excluir usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: CADASTRAR NOVO USUÁRIO                                 */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setIsModalOpen(false)
                setCreatedSummary(null)
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cadastrar Novo Usuário</h3>
                <p className="text-xs text-slate-400">
                  Crie a conta corporativa com credenciais e nível de acesso
                </p>
              </div>
            </div>

            {/* Sucesso com resumo de credenciais criadas */}
            {createdSummary ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Conta criada com sucesso!</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    O usuário já está ativo e pronto para acessar o sistema. Envie as credenciais abaixo para o colaborador:
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Nome:</span>
                    <span className="text-white font-semibold">{createdSummary.nome}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">E-mail de Login:</span>
                    <span className="text-cyan-300">{createdSummary.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Senha Inicial:</span>
                    <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-white font-bold">{createdSummary.senha}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdSummary.senha)
                          setCopiedPassword(true)
                          setTimeout(() => setCopiedPassword(false), 2000)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-sans cursor-pointer"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Senha</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[10px]">Permissão Atribuída:</span>
                    <span className="text-amber-400 font-sans font-semibold">
                      {getRoleLabel(createdSummary.nivel)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCreatedSummary(null)
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  >
                    Cadastrar Outro
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false)
                      setCreatedSummary(null)
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCadastrar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Ex: Fernando Souza"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    E-mail Corporativo *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="fernando.souza@rctech.com.br"
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Nível de Acesso / Função *
                  </label>
                  <select
                    value={novoNivelAcesso}
                    onChange={(e) => setNovoNivelAcesso(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value="tecnico_campo">Técnico de Campo (Acesso a OS e Visitas)</option>
                    <option value="suporte_bancada">Suporte de Bancada / Laboratório</option>
                    <option value="admin">Administrador (Permissão Total + Gestão de Usuários)</option>
                    <option value="atendente">Atendimento / Comercial</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Senha Inicial *
                    </label>
                    <button
                      type="button"
                      onClick={gerarSenhaAleatoria}
                      className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Gerar Senha Forte
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    O usuário poderá usar esta senha para acessar o sistema no portal de login.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Cadastrando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Confirmar Cadastro</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ALTERAR NÍVEL DE ACESSO                                */}
      {/* ============================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Alterar Nível de Acesso</h3>
            <p className="text-xs text-slate-400 mb-4">
              Colaborador: <span className="text-white font-semibold">{editingUser.nome}</span> ({editingUser.email})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nova Função / Permissão
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                >
                  <option value="tecnico_campo">Técnico de Campo</option>
                  <option value="suporte_bancada">Suporte de Bancada</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                  <option value="atendente">Atendimento / Comercial</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAtualizarRole}
                  disabled={isUpdatingRole}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Alteração</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO                                      */}
      {/* ============================================================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Remover Colaborador</h3>
            <p className="text-sm text-slate-300 mb-6">
              Tem certeza que deseja remover o usuário <span className="text-white font-bold">{deletingUser.nome}</span> ({deletingUser.email})? Ele perderá o acesso ao sistema imediatamente.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

