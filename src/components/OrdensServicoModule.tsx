import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sql } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { GeradorLaudoIA, type LaudoIAData } from './GeradorLaudoIA'
import {
  Wrench,
  Search,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Laptop,
  DollarSign,
  FileText,
  Printer,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Save,
  Check,
  Cpu
} from 'lucide-react'

export interface OrdemServico {
  id: string
  numero_os: number
  cliente_id: string
  cliente_nome: string
  cliente_documento?: string | null
  cliente_telefone?: string | null
  equipamento_id: string | null
  equipamento_info: string | null
  tecnico_id: string | null
  tecnico_nome: string | null
  tipo_servico: string
  status: string
  prioridade: string
  relato_problema: string
  diagnostico_tecnico?: string | null
  servicos_executados?: string | null
  pecas_utilizadas?: string[] | null
  valor_pecas?: number | null
  valor_servicos?: number | null
  valor_deslocamento?: number | null
  valor_total?: number | null
  data_abertura: string
  data_previsao?: string | null
  data_fechamento?: string | null
  termos_garantia?: string | null
  created_at?: string
}

interface ClienteOption {
  id: string
  nome_fantasia_ou_razao: string
  documento?: string
  tecnico_responsavel_id?: string | null
}

interface EquipamentoOption {
  id: string
  tipo_equipamento: string
  marca?: string | null
  modelo?: string | null
  numero_serie?: string | null
  patrimonio?: string | null
}

interface TecnicoOption {
  id: string
  nome: string
  email: string
  nivel_acesso: string
}

const STATUS_OPTIONS = [
  'Aberta',
  'Em Análise',
  'Em Execução',
  'Aguardando Peças',
  'Concluída',
  'Cancelada'
]

const PRIORIDADE_OPTIONS = ['Baixa', 'Média', 'Alta', 'Urgente']

const TIPOS_SERVICO_OPTIONS = [
  'Assistência de Bancada',
  'Suporte Técnico Externo (Visita)',
  'Instalação Avulsa',
  'Manutenção Preventiva',
  'Rede & CFTV',
  'Infraestrutura de TI'
]

export const OrdensServicoModule: React.FC = () => {
  const { session } = useAuth()
  const tecnicoLogado = session?.tecnico
  const isAdmin = tecnicoLogado?.nivel_acesso?.toLowerCase() === 'admin'

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([])
  const [equipamentosCliente, setEquipamentosCliente] = useState<EquipamentoOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todas')
  const [tipoServicoFilter, setTipoServicoFilter] = useState<string>('todos')
  const [tecnicoFilter, setTecnicoFilter] = useState<string>('todos')

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal de Criação de OS
  const [showNovaOSModal, setShowNovaOSModal] = useState(false)
  const [savingNovaOS, setSavingNovaOS] = useState(false)
  const [novaOSForm, setNovaOSForm] = useState({
    cliente_id: '',
    equipamento_id: '',
    tecnico_id: tecnicoLogado?.id || '',
    tipo_servico: 'Assistência de Bancada',
    prioridade: 'Média',
    previsao_dias: 2,
    relato_problema: '',
    valor_servicos: 0,
    valor_pecas: 0,
    valor_deslocamento: 0,
  })

  // Modal de Detalhes / Edição de OS
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)
  const [savingOSDetails, setSavingOSDetails] = useState(false)
  const [osEditData, setOsEditData] = useState({
    status: '',
    prioridade: '',
    tecnico_id: '',
    tipo_servico: '',
    diagnostico_tecnico: '',
    servicos_executados: '',
    valor_servicos: 0,
    valor_pecas: 0,
    valor_deslocamento: 0,
    valor_total: 0,
    termos_garantia: '',
  })

  // Modal de IA (Gerador de Laudo)
  const [showIAModal, setShowIAModal] = useState(false)

  // Modal de Impressão / Ficha OS
  const [showPrintModal, setShowPrintModal] = useState(false)

  // 1. Carregar lista de Ordens de Serviço
  const loadOrdens = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT 
          o.id,
          o.numero_os,
          o.cliente_id,
          c.nome_fantasia_ou_razao as cliente_nome,
          c.documento as cliente_documento,
          c.telefone as cliente_telefone,
          o.equipamento_id,
          CASE 
            WHEN e.id IS NOT NULL THEN CONCAT(e.tipo_equipamento, ' - ', COALESCE(e.marca, ''), ' ', COALESCE(e.modelo, ''))
            ELSE NULL
          END as equipamento_info,
          o.tecnico_id,
          t.nome as tecnico_nome,
          o.tipo_servico,
          o.status,
          o.prioridade,
          o.relato_problema,
          o.diagnostico_tecnico,
          o.servicos_executados,
          o.pecas_utilizadas,
          o.valor_pecas,
          o.valor_servicos,
          o.valor_deslocamento,
          o.valor_total,
          o.data_abertura,
          o.data_previsao,
          o.data_fechamento,
          o.termos_garantia,
          o.created_at
        FROM ordens_servico o
        JOIN clientes c ON c.id = o.cliente_id
        LEFT JOIN tecnicos t ON t.id = o.tecnico_id
        LEFT JOIN equipamentos_cliente e ON e.id = o.equipamento_id
        ORDER BY o.numero_os DESC
      `

      setOrdens(
        data.map((r: any) => ({
          ...r,
          data_abertura: r.data_abertura instanceof Date ? r.data_abertura.toISOString() : (r.data_abertura ? String(r.data_abertura) : ''),
          data_previsao: r.data_previsao instanceof Date ? r.data_previsao.toISOString() : (r.data_previsao ? String(r.data_previsao) : null),
          data_fechamento: r.data_fechamento instanceof Date ? r.data_fechamento.toISOString() : (r.data_fechamento ? String(r.data_fechamento) : null),
          numero_os: Number(r.numero_os),
          valor_pecas: r.valor_pecas ? Number(r.valor_pecas) : 0,
          valor_servicos: r.valor_servicos ? Number(r.valor_servicos) : 0,
          valor_deslocamento: r.valor_deslocamento ? Number(r.valor_deslocamento) : 0,
          valor_total: r.valor_total ? Number(r.valor_total) : 0,
        }))
      )
    } catch (err: any) {
      console.error('Erro ao buscar ordens de serviço:', err)
      setErrorBanner('Erro ao carregar Ordens de Serviço do banco de dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // 2. Carregar Clientes e Técnicos
  const loadAuxData = useCallback(async () => {
    try {
      const [cls, tecs] = await Promise.all([
        sql`SELECT id, nome_fantasia_ou_razao, documento, tecnico_responsavel_id FROM clientes ORDER BY nome_fantasia_ou_razao ASC`,
        sql`SELECT id, nome, email, nivel_acesso FROM tecnicos ORDER BY nome ASC`,
      ])
      setClientes(cls as ClienteOption[])
      setTecnicos(tecs as TecnicoOption[])
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err)
    }
  }, [])

  useEffect(() => {
    loadOrdens()
    loadAuxData()
  }, [loadOrdens, loadAuxData])

  // 3. Carregar equipamentos quando cliente é selecionado no cadastro de OS
  const handleClienteChange = async (clienteId: string) => {
    setNovaOSForm((prev) => ({ ...prev, cliente_id: clienteId, equipamento_id: '' }))
    if (!clienteId) {
      setEquipamentosCliente([])
      return
    }

    try {
      const equips = await sql`
        SELECT id, tipo_equipamento, marca, modelo, numero_serie, patrimonio
        FROM equipamentos_cliente
        WHERE cliente_id = ${clienteId}
        ORDER BY tipo_equipamento ASC
      `
      setEquipamentosCliente(equips as EquipamentoOption[])

      // Auto-atribuir técnico responsável do cliente se houver
      const clienteSel = clientes.find((c) => c.id === clienteId)
      if (clienteSel?.tecnico_responsavel_id) {
        setNovaOSForm((prev) => ({
          ...prev,
          tecnico_id: clienteSel.tecnico_responsavel_id || prev.tecnico_id,
        }))
      }
    } catch (err) {
      console.error('Erro ao carregar equipamentos do cliente:', err)
    }
  }

  // 4. Salvar Nova Ordem de Serviço
  const handleCriarOS = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novaOSForm.cliente_id) {
      setErrorBanner('Por favor, selecione um cliente.')
      return
    }

    if (!novaOSForm.relato_problema.trim()) {
      setErrorBanner('Por favor, descreva o relato do problema ou demanda técnica.')
      return
    }

    try {
      setSavingNovaOS(true)
      const previsaoData = new Date(
        Date.now() + (novaOSForm.previsao_dias || 2) * 24 * 60 * 60 * 1000
      ).toISOString()

      const total =
        Number(novaOSForm.valor_servicos || 0) +
        Number(novaOSForm.valor_pecas || 0) +
        Number(novaOSForm.valor_deslocamento || 0)

      const inserted = await sql`
        INSERT INTO ordens_servico (
          cliente_id,
          equipamento_id,
          tecnico_id,
          tipo_servico,
          status,
          prioridade,
          relato_problema,
          valor_servicos,
          valor_pecas,
          valor_deslocamento,
          valor_total,
          data_abertura,
          data_previsao
        )
        VALUES (
          ${novaOSForm.cliente_id},
          ${novaOSForm.equipamento_id || null},
          ${novaOSForm.tecnico_id || null},
          ${novaOSForm.tipo_servico},
          'Aberta',
          ${novaOSForm.prioridade},
          ${novaOSForm.relato_problema.trim()},
          ${novaOSForm.valor_servicos || 0},
          ${novaOSForm.valor_pecas || 0},
          ${novaOSForm.valor_deslocamento || 0},
          ${total},
          NOW(),
          ${previsaoData}
        )
        RETURNING numero_os
      `

      const numeroCriado = inserted[0]?.numero_os || 'nova'
      setSuccessBanner(`Ordem de Serviço #${numeroCriado} criada com sucesso no sistema!`)
      setShowNovaOSModal(false)

      // Reset Form
      setNovaOSForm({
        cliente_id: '',
        equipamento_id: '',
        tecnico_id: tecnicoLogado?.id || '',
        tipo_servico: 'Assistência de Bancada',
        prioridade: 'Média',
        previsao_dias: 2,
        relato_problema: '',
        valor_servicos: 0,
        valor_pecas: 0,
        valor_deslocamento: 0,
      })
      setEquipamentosCliente([])

      await loadOrdens()
    } catch (err: any) {
      console.error('Erro ao salvar OS:', err)
      setErrorBanner(err.message || 'Erro ao registrar nova Ordem de Serviço.')
    } finally {
      setSavingNovaOS(false)
    }
  }

  // 5. Abrir Modal de Detalhes
  const handleOpenDetails = (os: OrdemServico) => {
    setSelectedOS(os)
    setOsEditData({
      status: os.status,
      prioridade: os.prioridade || 'Média',
      tecnico_id: os.tecnico_id || '',
      tipo_servico: os.tipo_servico,
      diagnostico_tecnico: os.diagnostico_tecnico || '',
      servicos_executados: os.servicos_executados || '',
      valor_servicos: os.valor_servicos || 0,
      valor_pecas: os.valor_pecas || 0,
      valor_deslocamento: os.valor_deslocamento || 0,
      valor_total: os.valor_total || 0,
      termos_garantia: os.termos_garantia || 'Garantia legal de 90 dias para peças substituídas e serviços executados.',
    })
  }

  // 6. Atualizar Detalhes da OS
  const handleUpdateOS = async () => {
    if (!selectedOS) return

    try {
      setSavingOSDetails(true)
      const total =
        Number(osEditData.valor_servicos || 0) +
        Number(osEditData.valor_pecas || 0) +
        Number(osEditData.valor_deslocamento || 0)

      const isFechando = osEditData.status === 'Concluída'

      await sql`
        UPDATE ordens_servico
        SET
          status = ${osEditData.status},
          prioridade = ${osEditData.prioridade},
          tecnico_id = ${osEditData.tecnico_id || null},
          tipo_servico = ${osEditData.tipo_servico},
          diagnostico_tecnico = ${osEditData.diagnostico_tecnico.trim() || null},
          servicos_executados = ${osEditData.servicos_executados.trim() || null},
          valor_servicos = ${osEditData.valor_servicos || 0},
          valor_pecas = ${osEditData.valor_pecas || 0},
          valor_deslocamento = ${osEditData.valor_deslocamento || 0},
          valor_total = ${total},
          termos_garantia = ${osEditData.termos_garantia.trim() || null},
          data_fechamento = CASE 
            WHEN ${isFechando} AND data_fechamento IS NULL THEN NOW() 
            WHEN NOT ${isFechando} THEN NULL 
            ELSE data_fechamento 
          END
        WHERE id = ${selectedOS.id}
      `

      setSuccessBanner(`Ordem de Serviço #${selectedOS.numero_os} atualizada com sucesso!`)
      setSelectedOS(null)
      await loadOrdens()
    } catch (err: any) {
      console.error('Erro ao atualizar OS:', err)
      setErrorBanner(err.message || 'Erro ao salvar alterações da OS.')
    } finally {
      setSavingOSDetails(false)
    }
  }

  // 7. Salvar dados do Laudo IA no formulário da OS
  const handleApplyIALaudo = async (dados: LaudoIAData) => {
    setOsEditData((prev) => ({
      ...prev,
      diagnostico_tecnico: dados.diagnostico_tecnico,
      servicos_executados: dados.servicos_recomendados.join('\n• '),
      termos_garantia: dados.termos_garantia || prev.termos_garantia,
    }))
    setShowIAModal(false)
    setSuccessBanner('Laudo Técnico gerado por Inteligência Artificial preenchido com sucesso!')
  }

  // Cores de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aberta':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Clock className="w-3 h-3 text-blue-400" />
            Aberta
          </span>
        )
      case 'Em Análise':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Search className="w-3 h-3 text-purple-400" />
            Em Análise
          </span>
        )
      case 'Em Execução':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Wrench className="w-3 h-3 text-amber-400 animate-pulse" />
            Em Execução
          </span>
        )
      case 'Aguardando Peças':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Aguardando Peças
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-400 border border-slate-600">
            Cancelada
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        )
    }
  }

  // Cores de Prioridade
  const getPrioridadeBadge = (p: string) => {
    switch (p) {
      case 'Urgente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Urgente
          </span>
        )
      case 'Alta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Alta
          </span>
        )
      case 'Média':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Média
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Baixa
          </span>
        )
    }
  }

  // Filtros aplicados
  const filteredOrdens = useMemo(() => {
    return ordens.filter((o) => {
      // Busca textual
      const q = searchTerm.toLowerCase()
      const matchText =
        String(o.numero_os).includes(q) ||
        o.cliente_nome.toLowerCase().includes(q) ||
        o.relato_problema.toLowerCase().includes(q) ||
        (o.tecnico_nome && o.tecnico_nome.toLowerCase().includes(q)) ||
        (o.equipamento_info && o.equipamento_info.toLowerCase().includes(q))

      if (!matchText) return false

      // Status
      if (statusFilter !== 'todos' && o.status !== statusFilter) return false

      // Prioridade
      if (prioridadeFilter !== 'todas' && o.prioridade !== prioridadeFilter) return false

      // Tipo de Serviço
      if (tipoServicoFilter !== 'todos' && o.tipo_servico !== tipoServicoFilter) return false

      // Técnico
      if (tecnicoFilter !== 'todos' && o.tecnico_id !== tecnicoFilter) return false

      return true
    })
  }, [ordens, searchTerm, statusFilter, prioridadeFilter, tipoServicoFilter, tecnicoFilter])

  // Métricas
  const totalAbertas = ordens.filter((o) => ['Aberta', 'Em Análise'].includes(o.status)).length
  const totalExecucao = ordens.filter((o) => o.status === 'Em Execução').length
  const totalAguardando = ordens.filter((o) => o.status === 'Aguardando Peças').length
  const totalConcluidas = ordens.filter((o) => o.status === 'Concluída').length
  const valorTotalGeral = ordens
    .filter((o) => o.status !== 'Cancelada')
    .reduce((acc, curr) => acc + (curr.valor_total || 0), 0)

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Operação de TI & Bancada
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Ordens de Serviço (OS)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie atendimentos, diagnóstico de bancada, manutenções preventivas e chamados de campo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadOrdens()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar ordens de serviço"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => {
              setShowNovaOSModal(true)
              setErrorBanner(null)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ordem de Serviço</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('todos')}
          className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition ${
            statusFilter === 'todos' ? 'border-cyan-500/50 bg-slate-800/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Total de OS</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{ordens.length}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Todas as ordens</span>
        </div>

        <div
          onClick={() => setStatusFilter('Aberta')}
          className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition ${
            statusFilter === 'Aberta' ? 'border-blue-500/50 bg-blue-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-blue-400 font-semibold block">Abertas / Triagem</span>
          <span className="text-2xl font-extrabold text-blue-300 mt-1 block">{totalAbertas}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Aguardando atendimento</span>
        </div>

        <div
          onClick={() => setStatusFilter('Em Execução')}
          className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition ${
            statusFilter === 'Em Execução' ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold block">Em Andamento</span>
          <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{totalExecucao}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Técnico em execução</span>
        </div>

        <div
          onClick={() => setStatusFilter('Aguardando Peças')}
          className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition ${
            statusFilter === 'Aguardando Peças' ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-rose-400 font-semibold block">Aguardando Peças</span>
          <span className="text-2xl font-extrabold text-rose-300 mt-1 block">{totalAguardando}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Pecas / Compras</span>
        </div>

        <div
          onClick={() => setStatusFilter('Concluída')}
          className={`bg-slate-900/60 border rounded-xl p-4 cursor-pointer transition ${
            statusFilter === 'Concluída' ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold block">Concluídas</span>
          <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">{totalConcluidas}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Finalizadas</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca por texto */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por Nº da OS, cliente, relato ou técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          {/* Filtro Status */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todos">Status: Todos</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Prioridade */}
          <div className="sm:col-span-2">
            <select
              value={prioridadeFilter}
              onChange={(e) => setPrioridadeFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todas">Prioridade: Todas</option>
              {PRIORIDADE_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  Prioridade {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo de Serviço */}
          <div className="sm:col-span-3">
            <select
              value={tipoServicoFilter}
              onChange={(e) => setTipoServicoFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todos">Tipo: Todos os Serviços</option>
              {TIPOS_SERVICO_OPTIONS.map((ts) => (
                <option key={ts} value={ts}>
                  {ts}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>
            Exibindo <strong className="text-cyan-400 font-mono">{filteredOrdens.length}</strong> de {ordens.length} ordens de serviço
          </span>
          {(searchTerm || statusFilter !== 'todos' || prioridadeFilter !== 'todas' || tipoServicoFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setPrioridadeFilter('todas')
                setTipoServicoFilter('todos')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando ordens de serviço do banco de dados...</span>
          </div>
        ) : filteredOrdens.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Nenhuma Ordem de Serviço encontrada</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não encontramos registros com os filtros atuais. Crie uma nova OS ou redefina os parâmetros da busca.
            </p>
            <button
              onClick={() => setShowNovaOSModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova OS</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">OS Nº</th>
                  <th className="py-3.5 px-6">Cliente & Equipamento</th>
                  <th className="py-3.5 px-6">Tipo de Serviço</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Prioridade</th>
                  <th className="py-3.5 px-6">Técnico</th>
                  <th className="py-3.5 px-6">Previsão</th>
                  <th className="py-3.5 px-6 text-right">Valor Total</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredOrdens.map((os) => {
                  const isAtrasada =
                    os.data_previsao &&
                    new Date(os.data_previsao) < new Date() &&
                    !['Concluída', 'Cancelada'].includes(os.status)

                  return (
                    <tr
                      key={os.id}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetails(os)}
                    >
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 text-xs inline-block">
                          #{String(os.numero_os).padStart(3, '0')}
                        </span>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <span className="font-semibold text-white block truncate">{os.cliente_nome}</span>
                        {os.equipamento_info ? (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{os.equipamento_info}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic block">Equipamento não vinculado</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                        {os.tipo_servico}
                      </td>

                      <td className="py-4 px-6">{getStatusBadge(os.status)}</td>

                      <td className="py-4 px-6">{getPrioridadeBadge(os.prioridade)}</td>

                      <td className="py-4 px-6 text-xs text-slate-300">
                        {os.tecnico_nome ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            {os.tecnico_nome}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Não atribuído</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-xs font-mono">
                        {os.data_previsao ? (
                          <span className={isAtrasada ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-slate-400'}>
                            {isAtrasada && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                            {new Date(os.data_previsao).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-slate-500">--/--</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold text-xs text-emerald-400">
                        R$ {Number(os.valor_total || 0).toFixed(2)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDetails(os)
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
      {/* MODAL: CRIAR NOVA ORDEM DE SERVIÇO                             */}
      {/* ============================================================== */}
      {showNovaOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowNovaOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Nova Ordem de Serviço</h3>
                <p className="text-xs text-slate-400">
                  Cadastre um novo chamado ou atendimento técnico no sistema
                </p>
              </div>
            </div>

            <form onSubmit={handleCriarOS} className="space-y-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Cliente *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={novaOSForm.cliente_id}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
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
              </div>

              {/* Equipamento (Se houver) */}
              {novaOSForm.cliente_id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Equipamento Vinculado (Opcional)
                  </label>
                  <div className="relative">
                    <Laptop className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={novaOSForm.equipamento_id}
                      onChange={(e) => setNovaOSForm({ ...novaOSForm, equipamento_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                    >
                      <option value="">Nenhum / Atendimento na Infraestrutura do Local</option>
                      {equipamentosCliente.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.tipo_equipamento} - {eq.marca} {eq.modelo} {eq.patrimonio ? `[Patrimônio: ${eq.patrimonio}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {equipamentosCliente.length === 0 && (
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      O cliente não possui equipamentos cadastrados no momento.
                    </span>
                  )}
                </div>
              )}

              {/* Linha dupla: Tipo de Serviço e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tipo de Serviço *
                  </label>
                  <select
                    value={novaOSForm.tipo_servico}
                    onChange={(e) => setNovaOSForm({ ...novaOSForm, tipo_servico: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {TIPOS_SERVICO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Prioridade *
                  </label>
                  <select
                    value={novaOSForm.prioridade}
                    onChange={(e) => setNovaOSForm({ ...novaOSForm, prioridade: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {PRIORIDADE_OPTIONS.map((pr) => (
                      <option key={pr} value={pr}>
                        {pr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha dupla: Técnico e Previsão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Técnico Responsável
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={novaOSForm.tecnico_id}
                      onChange={(e) => setNovaOSForm({ ...novaOSForm, tecnico_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                    >
                      <option value="">Não atribuído no momento</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.nivel_acesso})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Previsão de Conclusão (Dias Úteis)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={novaOSForm.previsao_dias}
                      onChange={(e) =>
                        setNovaOSForm({ ...novaOSForm, previsao_dias: Number(e.target.value) || 1 })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Relato do Problema */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Relato do Problema / Demanda do Cliente *
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva com detalhes o defeito apresentado, solicitações do cliente, sintomas observados e condições de recebimento..."
                  value={novaOSForm.relato_problema}
                  onChange={(e) => setNovaOSForm({ ...novaOSForm, relato_problema: e.target.value })}
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  required
                />
              </div>

              {/* Valores Iniciais (Opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Valor Serviços (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novaOSForm.valor_servicos || ''}
                    placeholder="0.00"
                    onChange={(e) =>
                      setNovaOSForm({ ...novaOSForm, valor_servicos: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Valor Peças (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novaOSForm.valor_pecas || ''}
                    placeholder="0.00"
                    onChange={(e) =>
                      setNovaOSForm({ ...novaOSForm, valor_pecas: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Deslocamento (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novaOSForm.valor_deslocamento || ''}
                    placeholder="0.00"
                    onChange={(e) =>
                      setNovaOSForm({ ...novaOSForm, valor_deslocamento: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovaOSModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovaOS}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {savingNovaOS ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Ordem de Serviço</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VER / EDITAR ORDEM DE SERVIÇO                           */}
      {/* ============================================================== */}
      {selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOS(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Detalhe */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-extrabold text-xl">
                      OS #{String(selectedOS.numero_os).padStart(3, '0')}
                    </span>
                    {getStatusBadge(osEditData.status)}
                    {getPrioridadeBadge(osEditData.prioridade)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cliente: <strong className="text-white">{selectedOS.cliente_nome}</strong>
                    {selectedOS.equipamento_info && ` • ${selectedOS.equipamento_info}`}
                  </p>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Ficha Impressa / Comprovante"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ficha de Atendimento</span>
                </button>

                <button
                  onClick={() => setShowIAModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  title="Gerar diagnóstico e laudo usando Google Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Laudo com IA</span>
                </button>
              </div>
            </div>

            {/* Corpo do Formulário de Edição */}
            <div className="py-6 space-y-6">
              {/* Linha de Status, Prioridade e Técnico */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Status Atual da OS
                  </label>
                  <select
                    value={osEditData.status}
                    onChange={(e) => setOsEditData({ ...osEditData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nível de Prioridade
                  </label>
                  <select
                    value={osEditData.prioridade}
                    onChange={(e) => setOsEditData({ ...osEditData, prioridade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {PRIORIDADE_OPTIONS.map((pr) => (
                      <option key={pr} value={pr}>
                        Prioridade {pr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Técnico Responsável
                  </label>
                  <select
                    value={osEditData.tecnico_id}
                    onChange={(e) => setOsEditData({ ...osEditData, tecnico_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Relato do Problema (Somente Leitura ou Editável) */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Relato do Problema / Sintomas Informados
                </span>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedOS.relato_problema}
                </p>
              </div>

              {/* Diagnóstico Técnico */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Diagnóstico Técnico / Constatação da Causa-Raiz
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowIAModal(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Preencher com IA
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Ex: Identificado setor defeituoso no HD secundário e superaquecimento da CPU por pasta térmica ressecada..."
                  value={osEditData.diagnostico_tecnico}
                  onChange={(e) =>
                    setOsEditData({ ...osEditData, diagnostico_tecnico: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              {/* Serviços Executados */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Procedimentos & Serviços Executados
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Realizada limpeza interna completa, troca da pasta térmica por composto de prata e migração do sistema para SSD NVMe 500GB..."
                  value={osEditData.servicos_executados}
                  onChange={(e) =>
                    setOsEditData({ ...osEditData, servicos_executados: e.target.value })
                  }
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              {/* Termos de Garantia */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Termos de Garantia & Recomendações Técnicas
                </label>
                <input
                  type="text"
                  value={osEditData.termos_garantia}
                  onChange={(e) =>
                    setOsEditData({ ...osEditData, termos_garantia: e.target.value })
                  }
                  placeholder="Ex: Garantia legal de 90 dias para peças substituídas e serviços executados."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              {/* Grade de Valores e Totais */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Fechamento Financeiro da Ordem de Serviço
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Mão de Obra / Serviços (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={osEditData.valor_servicos}
                      onChange={(e) =>
                        setOsEditData({
                          ...osEditData,
                          valor_servicos: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Peças / Insumos (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={osEditData.valor_pecas}
                      onChange={(e) =>
                        setOsEditData({
                          ...osEditData,
                          valor_pecas: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Deslocamento / Km (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={osEditData.valor_deslocamento}
                      onChange={(e) =>
                        setOsEditData({
                          ...osEditData,
                          valor_deslocamento: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-cyan-500/30 flex flex-col justify-center">
                    <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
                      Total Calculado:
                    </span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      R${' '}
                      {(
                        Number(osEditData.valor_servicos || 0) +
                        Number(osEditData.valor_pecas || 0) +
                        Number(osEditData.valor_deslocamento || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal com Botões */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOS(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar sem Salvar
              </button>

              <button
                type="button"
                onClick={handleUpdateOS}
                disabled={savingOSDetails}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {savingOSDetails ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações da OS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GERADOR DE LAUDO TÉCNICO COM IA                         */}
      {/* ============================================================== */}
      {showIAModal && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-3xl shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowIAModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <GeradorLaudoIA
              tipo="laudo_os"
              contexto={{
                clienteNome: selectedOS.cliente_nome,
                equipamentoInfo: selectedOS.equipamento_info || 'Equipamento/Infra do Cliente',
                relatoProblemaOuDemanda: selectedOS.relato_problema,
                tipoServico: selectedOS.tipo_servico,
              }}
              initialData={{
                diagnostico_tecnico: osEditData.diagnostico_tecnico,
                termos_garantia: osEditData.termos_garantia,
              }}
              onSave={handleApplyIALaudo}
              onCancel={() => setShowIAModal(false)}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FICHA DE ATENDIMENTO / IMPRESSÃO                        */}
      {/* ============================================================== */}
      {showPrintModal && selectedOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:rounded-none">
            {/* Botões de Ação da Ficha (Ocultos ao imprimir) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Visualização Prévia para Impressão
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

            {/* Cabeçalho da OS Impressa */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-7 h-7 text-blue-600" />
                  <span className="text-2xl font-black text-slate-950 tracking-tight">RC Tech</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Gestão de TI, Redes, CFTV & Assistência Técnica Especializada
                </p>
                <p className="text-[11px] text-slate-500">
                  contato@rctech.com.br • Suporte Técnico Corporativo
                </p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black font-mono text-blue-700 block">
                  ORDEM DE SERVIÇO #{String(selectedOS.numero_os).padStart(3, '0')}
                </span>
                <span className="text-xs text-slate-600 block mt-1">
                  Data: {new Date(selectedOS.data_abertura).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-xs font-bold uppercase text-slate-700 block">
                  Status: {osEditData.status}
                </span>
              </div>
            </div>

            {/* Dados do Cliente e Equipamento */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Dados do Cliente:</span>
                <strong className="text-sm text-slate-900 block mt-0.5">{selectedOS.cliente_nome}</strong>
                {selectedOS.cliente_documento && <p className="text-slate-600">Doc: {selectedOS.cliente_documento}</p>}
                {selectedOS.cliente_telefone && <p className="text-slate-600">Tel: {selectedOS.cliente_telefone}</p>}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Equipamento / Serviço:</span>
                <strong className="text-sm text-slate-900 block mt-0.5">
                  {selectedOS.equipamento_info || 'Atendimento no Local / Infraestrutura'}
                </strong>
                <p className="text-slate-600 mt-0.5">Tipo: {osEditData.tipo_servico}</p>
                <p className="text-slate-600">
                  Técnico: {tecnicos.find((t) => t.id === osEditData.tecnico_id)?.nome || 'Equipe RC Tech'}
                </p>
              </div>
            </div>

            {/* Relato e Diagnóstico */}
            <div className="space-y-4 text-xs mb-6">
              <div>
                <span className="font-bold text-slate-900 uppercase block mb-1">
                  1. Descrição do Problema / Solicitação Inicial:
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedOS.relato_problema}
                </div>
              </div>

              {osEditData.diagnostico_tecnico && (
                <div>
                  <span className="font-bold text-slate-900 uppercase block mb-1">
                    2. Diagnóstico Técnico Realizado:
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {osEditData.diagnostico_tecnico}
                  </div>
                </div>
              )}

              {osEditData.servicos_executados && (
                <div>
                  <span className="font-bold text-slate-900 uppercase block mb-1">
                    3. Serviços Executados e Procedimentos de Manutenção:
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {osEditData.servicos_executados}
                  </div>
                </div>
              )}
            </div>

            {/* Tabela de Valores */}
            <div className="border border-slate-300 rounded-lg overflow-hidden text-xs mb-6">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5">Descrição Financeira</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5">Mão de Obra e Serviços Técnicos Especializados</td>
                    <td className="p-2.5 text-right font-mono font-medium">
                      R$ {Number(osEditData.valor_servicos || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Peças, Componentes e Materiais Substituídos</td>
                    <td className="p-2.5 text-right font-mono font-medium">
                      R$ {Number(osEditData.valor_pecas || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Taxa de Deslocamento Técnico / Atendimento Externo</td>
                    <td className="p-2.5 text-right font-mono font-medium">
                      R$ {Number(osEditData.valor_deslocamento || 0).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-sm">
                    <td className="p-2.5 text-slate-900">VALOR TOTAL DO ATENDIMENTO</td>
                    <td className="p-2.5 text-right font-mono text-blue-700">
                      R${' '}
                      {(
                        Number(osEditData.valor_servicos || 0) +
                        Number(osEditData.valor_pecas || 0) +
                        Number(osEditData.valor_deslocamento || 0)
                      ).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Termos de Garantia */}
            <div className="text-[11px] text-slate-600 mb-8 border-t border-slate-200 pt-3">
              <strong className="text-slate-800 block mb-0.5">Termos de Garantia:</strong>
              {osEditData.termos_garantia || 'Garantia legal de 90 dias para peças e serviços executados.'}
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">Técnico Responsável</span>
                <span className="text-[11px] text-slate-500">RC Tech Informática</span>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">{selectedOS.cliente_nome}</span>
                <span className="text-[11px] text-slate-500">Assinatura do Cliente / Responsável</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

