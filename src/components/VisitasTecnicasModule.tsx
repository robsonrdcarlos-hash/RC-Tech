import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sql } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import {
  Calendar,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  User,
  Building2,
  MapPin,
  Car,
  DollarSign,
  FileText,
  X,
  Loader2,
  RefreshCw,
  Printer,
  Save,
  Check,
  Navigation,
  Wrench,
  Server
} from 'lucide-react'

export interface VisitaTecnica {
  id: string
  cliente_id: string
  cliente_nome: string
  cliente_endereco?: string | null
  cliente_telefone?: string | null
  tecnico_id: string
  tecnico_nome: string
  ordem_servico_id?: string | null
  numero_os?: number | null
  projeto_id?: string | null
  titulo_projeto?: string | null
  data_agendamento: string
  status_visita: string
  motivo_visita: string
  relatorio_visita?: string | null
  km_rodado?: number | null
  valor_cobranca_visita?: number | null
  created_at?: string
}

interface ClienteOption {
  id: string
  nome_fantasia_ou_razao: string
  endereco?: string | null
  cidade?: string | null
  telefone?: string | null
  tecnico_responsavel_id?: string | null
}

interface TecnicoOption {
  id: string
  nome: string
  email: string
  nivel_acesso: string
}

interface OSOption {
  id: string
  numero_os: number
  cliente_id: string
  relato_problema: string
}

const STATUS_VISITA_OPTIONS = [
  'Agendada',
  'Em Deslocamento',
  'Em Atendimento',
  'Concluída',
  'Cancelada',
]

// Funções utilitárias seguras para manipulação de datas do Neon PostgreSQL
const getDatePart = (val: any): string => {
  if (!val) return ''
  if (val instanceof Date) return val.toISOString().split('T')[0]
  if (typeof val === 'string') return val.split('T')[0]
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

const getDatetimeLocalValue = (val: any): string => {
  if (!val) return ''
  try {
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

export const VisitasTecnicasModule: React.FC = () => {
  const { session } = useAuth()
  const tecnicoLogado = session?.tecnico

  const [visitas, setVisitas] = useState<VisitaTecnica[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([])
  const [ordensServico, setOrdensServico] = useState<OSOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [periodoFilter, setPeriodoFilter] = useState<'todas' | 'hoje' | 'futuras' | 'passadas'>('todas')

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal Nova Visita
  const [showNovaModal, setShowNovaModal] = useState(false)
  const [savingNova, setSavingNova] = useState(false)
  const [novaForm, setNovaForm] = useState({
    cliente_id: '',
    tecnico_id: tecnicoLogado?.id || '',
    ordem_servico_id: '',
    data_agendamento: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    status_visita: 'Agendada',
    motivo_visita: '',
    valor_cobranca_visita: 120,
    km_rodado: 0,
  })

  // Modal Detalhes / Edição
  const [selectedVisita, setSelectedVisita] = useState<VisitaTecnica | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    status_visita: '',
    tecnico_id: '',
    data_agendamento: '',
    motivo_visita: '',
    relatorio_visita: '',
    km_rodado: 0,
    valor_cobranca_visita: 0,
  })

  // Modal Imprimir Ficha de Visita
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Carregar Visitas
  const loadVisitas = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT 
          v.id,
          v.cliente_id,
          c.nome_fantasia_ou_razao as cliente_nome,
          CONCAT(COALESCE(c.endereco, ''), ' ', COALESCE(c.numero, ''), ' - ', COALESCE(c.bairro, ''), ', ', COALESCE(c.cidade, '')) as cliente_endereco,
          COALESCE(c.whatsapp, c.telefone) as cliente_telefone,
          v.tecnico_id,
          t.nome as tecnico_nome,
          v.ordem_servico_id,
          o.numero_os,
          v.projeto_id,
          p.titulo_projeto,
          v.data_agendamento,
          v.status_visita,
          v.motivo_visita,
          v.relatorio_visita,
          v.km_rodado,
          v.valor_cobranca_visita,
          v.created_at
        FROM visitas_tecnicas v
        JOIN clientes c ON c.id = v.cliente_id
        LEFT JOIN tecnicos t ON t.id = v.tecnico_id
        LEFT JOIN ordens_servico o ON o.id = v.ordem_servico_id
        LEFT JOIN projetos_infraestrutura p ON p.id = v.projeto_id
        ORDER BY v.data_agendamento DESC
      `

      setVisitas(
        data.map((r: any) => ({
          ...r,
          data_agendamento: r.data_agendamento instanceof Date 
            ? r.data_agendamento.toISOString() 
            : (r.data_agendamento ? String(r.data_agendamento) : ''),
          numero_os: r.numero_os ? Number(r.numero_os) : null,
          km_rodado: r.km_rodado ? Number(r.km_rodado) : 0,
          valor_cobranca_visita: r.valor_cobranca_visita ? Number(r.valor_cobranca_visita) : 0,
        }))
      )
    } catch (err: any) {
      console.error('Erro ao buscar visitas técnicas:', err)
      setErrorBanner('Erro ao carregar visitas técnicas do banco de dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Carregar Clientes, Técnicos e OSs
  const loadAuxData = useCallback(async () => {
    try {
      const [cls, tecs, oss] = await Promise.all([
        sql`SELECT id, nome_fantasia_ou_razao, endereco, cidade, telefone, tecnico_responsavel_id FROM clientes ORDER BY nome_fantasia_ou_razao ASC`,
        sql`SELECT id, nome, email, nivel_acesso FROM tecnicos ORDER BY nome ASC`,
        sql`SELECT id, numero_os, cliente_id, relato_problema FROM ordens_servico WHERE status NOT IN ('Concluída', 'Cancelada') ORDER BY numero_os DESC`,
      ])
      setClientes(cls as ClienteOption[])
      setTecnicos(tecs as TecnicoOption[])
      setOrdensServico(oss as OSOption[])
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err)
    }
  }, [])

  useEffect(() => {
    loadVisitas()
    loadAuxData()
  }, [loadVisitas, loadAuxData])

  // Salvar Nova Visita
  const handleCriarVisita = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novaForm.cliente_id) {
      setErrorBanner('Selecione o cliente da visita técnica.')
      return
    }

    if (!novaForm.tecnico_id) {
      setErrorBanner('Selecione o técnico responsável pela visita.')
      return
    }

    if (!novaForm.motivo_visita.trim()) {
      setErrorBanner('Informe o motivo ou objetivo da visita.')
      return
    }

    try {
      setSavingNova(true)
      await sql`
        INSERT INTO visitas_tecnicas (
          cliente_id,
          tecnico_id,
          ordem_servico_id,
          data_agendamento,
          status_visita,
          motivo_visita,
          km_rodado,
          valor_cobranca_visita
        )
        VALUES (
          ${novaForm.cliente_id},
          ${novaForm.tecnico_id},
          ${novaForm.ordem_servico_id || null},
          ${new Date(novaForm.data_agendamento).toISOString()},
          ${novaForm.status_visita},
          ${novaForm.motivo_visita.trim()},
          ${novaForm.km_rodado || 0},
          ${novaForm.valor_cobranca_visita || 0}
        )
      `

      setSuccessBanner('Visita técnica agendada com sucesso!')
      setShowNovaModal(false)
      setNovaForm({
        cliente_id: '',
        tecnico_id: tecnicoLogado?.id || '',
        ordem_servico_id: '',
        data_agendamento: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        status_visita: 'Agendada',
        motivo_visita: '',
        valor_cobranca_visita: 120,
        km_rodado: 0,
      })
      await loadVisitas()
    } catch (err: any) {
      console.error('Erro ao agendar visita:', err)
      setErrorBanner(err.message || 'Erro ao agendar visita técnica.')
    } finally {
      setSavingNova(false)
    }
  }

  // Abrir Modal de Edição
  const handleOpenEdit = (v: VisitaTecnica) => {
    setSelectedVisita(v)
    setEditForm({
      status_visita: v.status_visita,
      tecnico_id: v.tecnico_id,
      data_agendamento: getDatetimeLocalValue(v.data_agendamento),
      motivo_visita: v.motivo_visita || '',
      relatorio_visita: v.relatorio_visita || '',
      km_rodado: v.km_rodado || 0,
      valor_cobranca_visita: v.valor_cobranca_visita || 0,
    })
  }

  // Salvar Edição da Visita
  const handleUpdateVisita = async () => {
    if (!selectedVisita) return

    try {
      setSavingEdit(true)
      await sql`
        UPDATE visitas_tecnicas
        SET
          status_visita = ${editForm.status_visita},
          tecnico_id = ${editForm.tecnico_id},
          data_agendamento = ${new Date(editForm.data_agendamento).toISOString()},
          motivo_visita = ${editForm.motivo_visita.trim()},
          relatorio_visita = ${editForm.relatorio_visita.trim() || null},
          km_rodado = ${editForm.km_rodado || 0},
          valor_cobranca_visita = ${editForm.valor_cobranca_visita || 0}
        WHERE id = ${selectedVisita.id}
      `

      setSuccessBanner('Visita técnica atualizada com sucesso!')
      setSelectedVisita(null)
      await loadVisitas()
    } catch (err: any) {
      console.error('Erro ao atualizar visita:', err)
      setErrorBanner(err.message || 'Erro ao atualizar dados da visita técnica.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Badges de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Agendada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" />
            Agendada
          </span>
        )
      case 'Em Deslocamento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Navigation className="w-3 h-3 text-purple-400 animate-pulse" />
            Em Deslocamento
          </span>
        )
      case 'Em Atendimento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Wrench className="w-3 h-3 text-amber-400 animate-pulse" />
            Em Atendimento
          </span>
        )
      case 'Concluída':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Concluída
          </span>
        )
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Cancelada
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        )
    }
  }

  // Filtragem
  const filteredVisitas = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0]
    return visitas.filter((v) => {
      const q = searchTerm.toLowerCase()
      const clienteNome = (v.cliente_nome || '').toLowerCase()
      const motivo = (v.motivo_visita || '').toLowerCase()
      const tecnicoNome = (v.tecnico_nome || '').toLowerCase()
      const numeroOs = v.numero_os ? String(v.numero_os) : ''

      const matchText =
        clienteNome.includes(q) ||
        motivo.includes(q) ||
        tecnicoNome.includes(q) ||
        numeroOs.includes(q)

      if (!matchText) return false
      if (statusFilter !== 'todos' && v.status_visita !== statusFilter) return false

      const visitaDataStr = getDatePart(v.data_agendamento)
      if (periodoFilter === 'hoje') {
        if (visitaDataStr !== hojeStr) return false
      } else if (periodoFilter === 'futuras') {
        if (new Date(v.data_agendamento).getTime() < Date.now()) return false
      } else if (periodoFilter === 'passadas') {
        if (new Date(v.data_agendamento).getTime() >= Date.now()) return false
      }

      return true
    })
  }, [visitas, searchTerm, statusFilter, periodoFilter])

  // Contadores
  const hojeStr = new Date().toISOString().split('T')[0]
  const totalHoje = visitas.filter((v) => getDatePart(v.data_agendamento) === hojeStr).length
  const totalAgendadas = visitas.filter((v) => v.status_visita === 'Agendada').length
  const totalConcluidas = visitas.filter((v) => v.status_visita === 'Concluída').length
  const totalKm = visitas.reduce((acc, curr) => acc + (curr.km_rodado || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Atendimento de Campo & Externo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Visitas Técnicas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Controle agendamentos presenciais, deslocamento, relatórios de vistoria e rotas técnicas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadVisitas()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar visitas"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setShowNovaModal(true)
              setErrorBanner(null)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Visita</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setPeriodoFilter('hoje')
            setStatusFilter('todos')
          }}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            periodoFilter === 'hoje' ? 'border-cyan-500/50 bg-slate-800/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Visitas para Hoje</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{totalHoje}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Agendamentos para o dia atual</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Agendada')
            setPeriodoFilter('todas')
          }}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'Agendada' ? 'border-blue-500/50 bg-blue-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Agendadas</p>
              <h3 className="text-3xl font-extrabold text-blue-300 mt-1">{totalAgendadas}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Visitas pendentes na fila</p>
        </div>

        <div
          onClick={() => {
            setStatusFilter('Concluída')
            setPeriodoFilter('todas')
          }}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'Concluída' ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Concluídas</p>
              <h3 className="text-3xl font-extrabold text-emerald-300 mt-1">{totalConcluidas}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Atendimentos finalizados</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Quilometragem Total</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{totalKm.toFixed(1)} km</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Deslocamento registrado da frota</p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, motivo da visita, técnico ou OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todos">Status: Todos</option>
              {STATUS_VISITA_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={periodoFilter}
              onChange={(e) => setPeriodoFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todas">Período: Todas as datas</option>
              <option value="hoje">Apenas de Hoje</option>
              <option value="futuras">Próximas Visitas</option>
              <option value="passadas">Histórico Anterior</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>
            Exibindo <strong className="text-cyan-400 font-mono">{filteredVisitas.length}</strong> de {visitas.length} visitas
          </span>
          {(searchTerm || statusFilter !== 'todos' || periodoFilter !== 'todas') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setPeriodoFilter('todas')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Visitas */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando visitas técnicas...</span>
          </div>
        ) : filteredVisitas.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Nenhuma visita técnica encontrada</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não existem registros para os filtros selecionados. Agende uma nova visita técnica.
            </p>
            <button
              onClick={() => setShowNovaModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar Visita</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Data & Horário</th>
                  <th className="py-3.5 px-6">Cliente & Local</th>
                  <th className="py-3.5 px-6">Motivo da Visita</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Técnico</th>
                  <th className="py-3.5 px-6">Vínculo</th>
                  <th className="py-3.5 px-6 text-right">Taxa (R$)</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVisitas.map((v) => {
                  const d = new Date(v.data_agendamento)
                  const isValidDate = !isNaN(d.getTime())
                  const isHoje = getDatePart(v.data_agendamento) === hojeStr

                  return (
                    <tr
                      key={v.id}
                      onClick={() => handleOpenEdit(v)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-mono text-xs">
                        <span className={isHoje ? 'font-bold text-cyan-400 block' : 'text-white block'}>
                          {isValidDate ? d.toLocaleDateString('pt-BR') : '--/--'}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {isValidDate ? `${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h` : ''}
                        </span>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <span className="font-semibold text-white block truncate">{v.cliente_nome}</span>
                        {v.cliente_endereco && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{v.cliente_endereco}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-200 max-w-xs truncate">
                        {v.motivo_visita}
                      </td>

                      <td className="py-4 px-6">{getStatusBadge(v.status_visita)}</td>

                      <td className="py-4 px-6 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          {v.tecnico_nome}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs">
                        {v.numero_os ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-[11px]">
                            OS #{String(v.numero_os).padStart(3, '0')}
                          </span>
                        ) : v.titulo_projeto ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] truncate max-w-[120px] inline-block">
                            {v.titulo_projeto}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right font-mono text-xs text-emerald-400 font-bold">
                        R$ {Number(v.valor_cobranca_visita || 0).toFixed(2)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(v)
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 transition border border-cyan-500/20 cursor-pointer"
                        >
                          Ver / Editar
                        </button>
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
      {/* MODAL: NOVA VISITA TÉCNICA                                     */}
      {/* ============================================================== */}
      {showNovaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNovaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Agendar Visita Técnica</h3>
                <p className="text-xs text-slate-400">
                  Cadastre uma visita presencial para suporte, vistorias ou implantação
                </p>
              </div>
            </div>

            <form onSubmit={handleCriarVisita} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cliente *
                </label>
                <select
                  value={novaForm.cliente_id}
                  onChange={(e) => setNovaForm({ ...novaForm, cliente_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  required
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia_ou_razao} {c.cidade ? `(${c.cidade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Técnico Responsável *
                  </label>
                  <select
                    value={novaForm.tecnico_id}
                    onChange={(e) => setNovaForm({ ...novaForm, tecnico_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                    required
                  >
                    <option value="">Selecione o técnico...</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data e Horário *
                  </label>
                  <input
                    type="datetime-local"
                    value={novaForm.data_agendamento}
                    onChange={(e) => setNovaForm({ ...novaForm, data_agendamento: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Vincular a uma Ordem de Serviço (Opcional)
                  </label>
                  <select
                    value={novaForm.ordem_servico_id}
                    onChange={(e) => setNovaForm({ ...novaForm, ordem_servico_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value="">Sem OS vinculada (Visita avulsa / Vistoria)</option>
                    {ordensServico
                      .filter((o) => !novaForm.cliente_id || o.cliente_id === novaForm.cliente_id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          OS #{String(o.numero_os).padStart(3, '0')} - {o.relato_problema.slice(0, 40)}...
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Taxa de Deslocamento / Cobrança (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novaForm.valor_cobranca_visita}
                    onChange={(e) =>
                      setNovaForm({
                        ...novaForm,
                        valor_cobranca_visita: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Motivo da Visita / Escopo no Local *
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Vistoria de cabeamento do rack secundário, teste de sinal Wi-Fi no estoque e alinhamento da câmera do portão..."
                  value={novaForm.motivo_visita}
                  onChange={(e) => setNovaForm({ ...novaForm, motivo_visita: e.target.value })}
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovaModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNova}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingNova ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Agendando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Confirmar Agendamento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VER / EDITAR VISITA TÉCNICA                             */}
      {/* ============================================================== */}
      {selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedVisita(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedVisita.cliente_nome}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedVisita.cliente_endereco || 'Endereço não informado'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Comprovante</span>
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Status da Visita
                  </label>
                  <select
                    value={editForm.status_visita}
                    onChange={(e) => setEditForm({ ...editForm, status_visita: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_VISITA_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Técnico Atribuído
                  </label>
                  <select
                    value={editForm.tecnico_id}
                    onChange={(e) => setEditForm({ ...editForm, tecnico_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data e Horário
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.data_agendamento}
                    onChange={(e) => setEditForm({ ...editForm, data_agendamento: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Km Rodado (Frota)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editForm.km_rodado}
                    onChange={(e) =>
                      setEditForm({ ...editForm, km_rodado: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Valor Cobrado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.valor_cobranca_visita}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        valor_cobranca_visita: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Motivo Inicial da Visita
                </label>
                <input
                  type="text"
                  value={editForm.motivo_visita}
                  onChange={(e) => setEditForm({ ...editForm, motivo_visita: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Relatório Técnico de Execução no Local
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva as ações realizadas no cliente, testes executados, equipamentos vistoriados e recomendações deixadas..."
                  value={editForm.relatorio_visita}
                  onChange={(e) => setEditForm({ ...editForm, relatorio_visita: e.target.value })}
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedVisita(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleUpdateVisita}
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

      {/* MODAL: IMPRESSÃO COMPROVANTE VISITA */}
      {showPrintModal && selectedVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:rounded-none">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Comprovante de Atendimento Presencial
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
                <p className="text-xs text-slate-600">Suporte Técnico Presencial & Redes Corporativas</p>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-blue-700 block">
                  COMPROVANTE DE VISITA
                </span>
                <span className="text-xs text-slate-600 block">
                  Data: {new Date(editForm.data_agendamento).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 space-y-2">
              <p><strong>Cliente:</strong> {selectedVisita.cliente_nome}</p>
              <p><strong>Endereço:</strong> {selectedVisita.cliente_endereco || 'Não informado'}</p>
              <p><strong>Técnico:</strong> {tecnicos.find((t) => t.id === editForm.tecnico_id)?.nome || 'RC Tech'}</p>
              <p><strong>Status:</strong> {editForm.status_visita}</p>
              <p><strong>Valor da Visita:</strong> R$ {Number(editForm.valor_cobranca_visita || 0).toFixed(2)}</p>
            </div>

            <div className="text-xs mb-8 space-y-4">
              <div>
                <strong className="block text-slate-900 uppercase mb-1">Motivo:</strong>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                  {editForm.motivo_visita}
                </p>
              </div>
              {editForm.relatorio_visita && (
                <div>
                  <strong className="block text-slate-900 uppercase mb-1">Relatório dos Serviços Realizados:</strong>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap">
                    {editForm.relatorio_visita}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">Assinatura do Técnico</span>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">Assinatura do Cliente / Recebedor</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

