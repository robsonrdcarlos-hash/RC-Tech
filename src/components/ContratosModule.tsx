import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sql } from '@/lib/db'
import {
  FileCheck2,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  ShieldCheck,
  Printer,
  Save,
  X,
  Loader2,
  RefreshCw,
  TrendingUp,
  FileText,
  Check
} from 'lucide-react'

export interface ContratoRecorrente {
  id: string
  cliente_id: string
  cliente_nome: string
  cliente_documento?: string | null
  titulo_contrato: string
  escopo_servicos?: any
  sla_horas?: number | null
  valor_mensal: number
  data_inicio?: string | null
  data_fim?: string | null
  status_contrato: string
  created_at?: string
}

interface ClienteOption {
  id: string
  nome_fantasia_ou_razao: string
  documento?: string
}

const STATUS_CONTRATO_OPTIONS = [
  'Ativo',
  'Em Negociação',
  'Pendente',
  'Suspenso',
  'Cancelado'
]

// Helper seguro para converter datas retornadas pelo Neon PostgreSQL
const toDateInputString = (val: any): string => {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().split('T')[0]
  if (typeof val === 'string') return val.split('T')[0]
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export const ContratosModule: React.FC = () => {
  const [contratos, setContratos] = useState<ContratoRecorrente[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal Novo Contrato
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [savingNovo, setSavingNovo] = useState(false)
  const [novoForm, setNovoForm] = useState({
    cliente_id: '',
    titulo_contrato: '',
    valor_mensal: 0,
    sla_horas: 4,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status_contrato: 'Ativo',
    suporte_remoto: true,
    visitas_mensais: 2,
    backup_gerenciado: true,
    observacoes_escopo: '',
  })

  // Modal Edição / Detalhes
  const [selectedContrato, setSelectedContrato] = useState<ContratoRecorrente | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo_contrato: '',
    valor_mensal: 0,
    sla_horas: 4,
    data_inicio: '',
    data_fim: '',
    status_contrato: '',
    observacoes_escopo: '',
  })

  // Modal Impressão
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Carregar Contratos
  const loadContratos = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT 
          ct.id,
          ct.cliente_id,
          c.nome_fantasia_ou_razao as cliente_nome,
          c.documento as cliente_documento,
          ct.titulo_contrato,
          ct.escopo_servicos,
          ct.sla_horas,
          ct.valor_mensal,
          ct.data_inicio,
          ct.data_fim,
          ct.status_contrato,
          ct.created_at
        FROM contratos_manutencao_recorrente ct
        JOIN clientes c ON c.id = ct.cliente_id
        ORDER BY ct.status_contrato ASC, ct.valor_mensal DESC
      `

      setContratos(
        data.map((r: any) => ({
          ...r,
          data_inicio: toDateInputString(r.data_inicio),
          data_fim: toDateInputString(r.data_fim),
          sla_horas: r.sla_horas ? Number(r.sla_horas) : 4,
          valor_mensal: r.valor_mensal ? Number(r.valor_mensal) : 0,
        }))
      )
    } catch (err: any) {
      console.error('Erro ao buscar contratos:', err)
      setErrorBanner('Erro ao carregar contratos de manutenção do banco de dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Carregar Clientes
  const loadClientes = useCallback(async () => {
    try {
      const cls = await sql`SELECT id, nome_fantasia_ou_razao, documento FROM clientes ORDER BY nome_fantasia_ou_razao ASC`
      setClientes(cls as ClienteOption[])
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    }
  }, [])

  useEffect(() => {
    loadContratos()
    loadClientes()
  }, [loadContratos, loadClientes])

  // Salvar Novo Contrato
  const handleCriarContrato = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novoForm.cliente_id) {
      setErrorBanner('Selecione o cliente contratante.')
      return
    }

    if (!novoForm.titulo_contrato.trim()) {
      setErrorBanner('Informe o título do contrato.')
      return
    }

    try {
      setSavingNovo(true)
      const escopoObjeto = {
        suporte_remoto: novoForm.suporte_remoto ? 'ilimitado' : 'sob_demanda',
        visitas_mensais: Number(novoForm.visitas_mensais) || 0,
        backup_gerenciado: Boolean(novoForm.backup_gerenciado),
        observacoes: novoForm.observacoes_escopo.trim() || undefined,
      }

      await sql`
        INSERT INTO contratos_manutencao_recorrente (
          cliente_id,
          titulo_contrato,
          escopo_servicos,
          sla_horas,
          valor_mensal,
          data_inicio,
          data_fim,
          status_contrato
        )
        VALUES (
          ${novoForm.cliente_id},
          ${novoForm.titulo_contrato.trim()},
          ${JSON.stringify(escopoObjeto)},
          ${novoForm.sla_horas || 4},
          ${novoForm.valor_mensal || 0},
          ${novoForm.data_inicio || null},
          ${novoForm.data_fim || null},
          ${novoForm.status_contrato}
        )
      `

      setSuccessBanner(`Contrato "${novoForm.titulo_contrato.trim()}" cadastrado com sucesso!`)
      setShowNovoModal(false)
      setNovoForm({
        cliente_id: '',
        titulo_contrato: '',
        valor_mensal: 0,
        sla_horas: 4,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status_contrato: 'Ativo',
        suporte_remoto: true,
        visitas_mensais: 2,
        backup_gerenciado: true,
        observacoes_escopo: '',
      })
      await loadContratos()
    } catch (err: any) {
      console.error('Erro ao cadastrar contrato:', err)
      setErrorBanner(err.message || 'Erro ao salvar novo contrato de manutenção.')
    } finally {
      setSavingNovo(false)
    }
  }

  // Abrir Modal de Edição
  const handleOpenEdit = (ct: ContratoRecorrente) => {
    setSelectedContrato(ct)
    let escopoObs = ''
    if (ct.escopo_servicos) {
      if (typeof ct.escopo_servicos === 'string') {
        escopoObs = ct.escopo_servicos
      } else {
        escopoObs =
          ct.escopo_servicos.observacoes || JSON.stringify(ct.escopo_servicos, null, 2)
      }
    }

    setEditForm({
      titulo_contrato: ct.titulo_contrato,
      valor_mensal: ct.valor_mensal,
      sla_horas: ct.sla_horas || 4,
      data_inicio: toDateInputString(ct.data_inicio),
      data_fim: toDateInputString(ct.data_fim),
      status_contrato: ct.status_contrato,
      observacoes_escopo: escopoObs,
    })
  }

  // Salvar Edição
  const handleUpdateContrato = async () => {
    if (!selectedContrato) return

    try {
      setSavingEdit(true)
      const escopoAtualizado = {
        ...((typeof selectedContrato.escopo_servicos === 'object' && selectedContrato.escopo_servicos) || {}),
        observacoes: editForm.observacoes_escopo.trim() || undefined,
      }

      await sql`
        UPDATE contratos_manutencao_recorrente
        SET
          titulo_contrato = ${editForm.titulo_contrato.trim()},
          valor_mensal = ${editForm.valor_mensal || 0},
          sla_horas = ${editForm.sla_horas || 4},
          data_inicio = ${editForm.data_inicio || null},
          data_fim = ${editForm.data_fim || null},
          status_contrato = ${editForm.status_contrato},
          escopo_servicos = ${JSON.stringify(escopoAtualizado)}
        WHERE id = ${selectedContrato.id}
      `

      setSuccessBanner(`Contrato "${editForm.titulo_contrato}" atualizado com sucesso!`)
      setSelectedContrato(null)
      await loadContratos()
    } catch (err: any) {
      console.error('Erro ao atualizar contrato:', err)
      setErrorBanner(err.message || 'Erro ao salvar alterações do contrato.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Badges de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Ativo
          </span>
        )
      case 'Em Negociação':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" />
            Em Negociação
          </span>
        )
      case 'Pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Pendente
          </span>
        )
      case 'Suspenso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            Suspenso
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        )
    }
  }

  // Filtragem
  const filteredContratos = useMemo(() => {
    return contratos.filter((ct) => {
      const q = searchTerm.toLowerCase()
      const matchText =
        ct.titulo_contrato.toLowerCase().includes(q) ||
        ct.cliente_nome.toLowerCase().includes(q)

      if (!matchText) return false
      if (statusFilter !== 'todos' && ct.status_contrato !== statusFilter) return false
      return true
    })
  }, [contratos, searchTerm, statusFilter])

  // Contadores & MRR
  const totalAtivos = contratos.filter((ct) => ct.status_contrato === 'Ativo').length
  const totalMRR = contratos
    .filter((ct) => ct.status_contrato === 'Ativo')
    .reduce((acc, curr) => acc + (curr.valor_mensal || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Faturamento Recorrente & SLA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Contratos de Manutenção
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestão de mensalidades, acordos de nível de serviço (SLA) e cobertura de suporte contínuo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadContratos()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar contratos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setShowNovoModal(true)
              setErrorBanner(null)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* Banners */}
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

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Contratos</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{contratos.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Contratos cadastrados no sistema</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Contratos Ativos</p>
              <h3 className="text-3xl font-extrabold text-emerald-300 mt-1">{totalAtivos}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Clientes em suporte recorrente</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Receita Mensal (MRR)</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">
                R$ {totalMRR.toFixed(2)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Faturamento recorrente garantido</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">SLA Médio Contratado</p>
              <h3 className="text-3xl font-extrabold text-purple-300 mt-1 font-mono">4 horas</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Tempo máximo para resposta técnica</p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título do contrato ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todos">Status: Todos</option>
              {STATUS_CONTRATO_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>
            Exibindo <strong className="text-cyan-400 font-mono">{filteredContratos.length}</strong> de {contratos.length} contratos
          </span>
          {(searchTerm || statusFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Contratos */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando contratos de manutenção...</span>
          </div>
        ) : filteredContratos.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <FileCheck2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Nenhum contrato encontrado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Cadastre contratos de suporte mensal para acompanhar SLA e faturamento recorrente.
            </p>
            <button
              onClick={() => setShowNovoModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Contrato</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Contrato & Escopo</th>
                  <th className="py-3.5 px-6">Cliente</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">SLA Resposta</th>
                  <th className="py-3.5 px-6">Vigência</th>
                  <th className="py-3.5 px-6 text-right">Valor Mensal</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContratos.map((ct) => (
                  <tr
                    key={ct.id}
                    onClick={() => handleOpenEdit(ct)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <span className="font-semibold text-white block truncate">{ct.titulo_contrato}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Suporte Preventivo & Corretivo</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{ct.cliente_nome}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">{getStatusBadge(ct.status_contrato)}</td>

                    <td className="py-4 px-6 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                        {ct.sla_horas} horas
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs font-mono text-slate-400">
                      {ct.data_inicio ? new Date(ct.data_inicio).toLocaleDateString('pt-BR') : '--/--'} até{' '}
                      {ct.data_fim ? new Date(ct.data_fim).toLocaleDateString('pt-BR') : '--/--'}
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-xs text-emerald-400">
                      R$ {Number(ct.valor_mensal || 0).toFixed(2)}/mês
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(ct)
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 transition border border-cyan-500/20 cursor-pointer"
                      >
                        Ver / Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: NOVO CONTRATO DE MANUTENÇÃO                             */}
      {/* ============================================================== */}
      {showNovoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNovoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Novo Contrato de Manutenção</h3>
                <p className="text-xs text-slate-400">
                  Defina o escopo, SLA e mensalidade recorrente para o cliente
                </p>
              </div>
            </div>

            <form onSubmit={handleCriarContrato} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cliente *
                </label>
                <select
                  value={novoForm.cliente_id}
                  onChange={(e) => setNovoForm({ ...novoForm, cliente_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  required
                >
                  <option value="">Selecione o cliente contratante...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia_ou_razao} {c.documento ? `(${c.documento})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Título do Contrato *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contrato Mensal de Suporte e Manutenção de TI - Redes & Servidores"
                  value={novoForm.titulo_contrato}
                  onChange={(e) => setNovoForm({ ...novoForm, titulo_contrato: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Valor Mensal (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={novoForm.valor_mensal || ''}
                      placeholder="0.00"
                      onChange={(e) =>
                        setNovoForm({
                          ...novoForm,
                          valor_mensal: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    SLA Máximo (Horas) *
                  </label>
                  <select
                    value={novoForm.sla_horas}
                    onChange={(e) =>
                      setNovoForm({ ...novoForm, sla_horas: Number(e.target.value) || 4 })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value={2}>2 Horas (Crítico / Emergencial)</option>
                    <option value={4}>4 Horas (Padrão Corporativo)</option>
                    <option value={8}>8 Horas (Mesmo dia útil)</option>
                    <option value={24}>24 Horas (Atendimento normal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Status Inicial *
                  </label>
                  <select
                    value={novoForm.status_contrato}
                    onChange={(e) => setNovoForm({ ...novoForm, status_contrato: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_CONTRATO_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={novoForm.data_inicio}
                    onChange={(e) => setNovoForm({ ...novoForm, data_inicio: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data de Término / Renovação
                  </label>
                  <input
                    type="date"
                    value={novoForm.data_fim}
                    onChange={(e) => setNovoForm({ ...novoForm, data_fim: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>
              </div>

              {/* Escopo de Serviços Inclusos */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Cobertura Contratual Inclusa
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novoForm.suporte_remoto}
                      onChange={(e) =>
                        setNovoForm({ ...novoForm, suporte_remoto: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Suporte Remoto Ilimitado</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novoForm.backup_gerenciado}
                      onChange={(e) =>
                        setNovoForm({ ...novoForm, backup_gerenciado: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span>Gestão de Backup em Nuvem</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Visitas/mês:</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={novoForm.visitas_mensais}
                      onChange={(e) =>
                        setNovoForm({ ...novoForm, visitas_mensais: Number(e.target.value) || 0 })
                      }
                      className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cláusulas Específicas / Observações do Contrato
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva detalhes específicos de infraestrutura, número de estações atendidas e condições contratuais..."
                  value={novoForm.observacoes_escopo}
                  onChange={(e) =>
                    setNovoForm({ ...novoForm, observacoes_escopo: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovoModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovo}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingNovo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Contrato</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VER / EDITAR CONTRATO                                   */}
      {/* ============================================================== */}
      {selectedContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedContrato(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedContrato.cliente_nome}</h3>
                  <p className="text-xs text-slate-400">
                    Contrato de Manutenção e Suporte Contínuo
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ficha do Contrato</span>
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Título do Contrato
                </label>
                <input
                  type="text"
                  value={editForm.titulo_contrato}
                  onChange={(e) => setEditForm({ ...editForm, titulo_contrato: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valor_mensal}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        valor_mensal: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    SLA Máximo (Horas)
                  </label>
                  <select
                    value={editForm.sla_horas}
                    onChange={(e) =>
                      setEditForm({ ...editForm, sla_horas: Number(e.target.value) || 4 })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value={2}>2 Horas (Emergencial)</option>
                    <option value={4}>4 Horas (Padrão)</option>
                    <option value={8}>8 Horas (Mesmo dia)</option>
                    <option value={24}>24 Horas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Status do Contrato
                  </label>
                  <select
                    value={editForm.status_contrato}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status_contrato: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_CONTRATO_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Início da Vigência
                  </label>
                  <input
                    type="date"
                    value={editForm.data_inicio}
                    onChange={(e) => setEditForm({ ...editForm, data_inicio: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Término / Renovação
                  </label>
                  <input
                    type="date"
                    value={editForm.data_fim}
                    onChange={(e) => setEditForm({ ...editForm, data_fim: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cláusulas, Observações e Escopo de Serviços
                </label>
                <textarea
                  rows={4}
                  value={editForm.observacoes_escopo}
                  onChange={(e) =>
                    setEditForm({ ...editForm, observacoes_escopo: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedContrato(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleUpdateContrato}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPRESSÃO FICHA DE CONTRATO */}
      {showPrintModal && selectedContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:rounded-none">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Termo de Contrato de Manutenção
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Agora</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <span className="text-2xl font-black text-slate-950 tracking-tight">RC Tech</span>
                <p className="text-xs text-slate-600">Contratos de Suporte e Manutenção Continuada de TI</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-blue-700 block">
                  TERMO DE CONTRATO
                </span>
                <span className="text-xs text-slate-600 block">
                  Status: <strong>{editForm.status_contrato}</strong>
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 space-y-2">
              <p><strong>Objeto:</strong> {editForm.titulo_contrato}</p>
              <p><strong>Contratante:</strong> {selectedContrato.cliente_nome}</p>
              <p><strong>Valor Mensal:</strong> R$ {Number(editForm.valor_mensal || 0).toFixed(2)}/mês</p>
              <p><strong>SLA de Atendimento:</strong> Até {editForm.sla_horas} horas</p>
              <p><strong>Período de Vigência:</strong> {editForm.data_inicio} até {editForm.data_fim}</p>
            </div>

            <div className="text-xs mb-8 space-y-4">
              <div>
                <strong className="block text-slate-900 uppercase mb-1 font-bold">
                  Cláusulas e Condições de Cobertura:
                </strong>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                  {editForm.observacoes_escopo || 'Contrato de manutenção continuada com suporte técnico corporativo RC Tech.'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">RC Tech Informática</span>
                <span className="text-[11px] text-slate-500">Contratada</span>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">{selectedContrato.cliente_nome}</span>
                <span className="text-[11px] text-slate-500">Contratante</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

