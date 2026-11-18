import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sql } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { GeradorLaudoIA, type LaudoIAData } from './GeradorLaudoIA'
import {
  Server,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  Printer,
  Save,
  Wifi,
  Video,
  Cable,
  Layers,
  FileText,
  Activity
} from 'lucide-react'

export interface ProjetoInfra {
  id: string
  cliente_id: string
  cliente_nome: string
  cliente_documento?: string | null
  titulo_projeto: string
  tipo_projeto: string
  status: string
  responsavel_tecnico_id?: string | null
  tecnico_nome?: string | null
  data_inicio_prevista?: string | null
  data_conclusao?: string | null
  observacoes_projeto?: string | null
  created_at?: string
}

interface ClienteOption {
  id: string
  nome_fantasia_ou_razao: string
  documento?: string
  tecnico_responsavel_id?: string | null
}

interface TecnicoOption {
  id: string
  nome: string
  email: string
  nivel_acesso: string
}

const STATUS_PROJETO_OPTIONS = [
  'Planejamento',
  'Aprovado',
  'Em Execução',
  'Pendente Validação',
  'Concluído',
  'Cancelado',
]

const TIPOS_PROJETO_OPTIONS = [
  'Cabeamento Estruturado',
  'CFTV IP',
  'Rede Wi-Fi',
  'Servidor / Cloud',
  'Rack & Organização',
  'Fibra Óptica',
  'Controle de Acesso',
  'Infraestrutura Geral'
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

export const ProjetosInfraModule: React.FC = () => {
  const { session } = useAuth()
  const tecnicoLogado = session?.tecnico

  const [projetos, setProjetos] = useState<ProjetoInfra[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal Novo Projeto
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [savingNovo, setSavingNovo] = useState(false)
  const [novoForm, setNovoForm] = useState({
    cliente_id: '',
    titulo_projeto: '',
    tipo_projeto: 'Cabeamento Estruturado',
    status: 'Planejamento',
    responsavel_tecnico_id: tecnicoLogado?.id || '',
    data_inicio_prevista: new Date().toISOString().split('T')[0],
    data_conclusao: '',
    observacoes_projeto: '',
  })

  // Modal Detalhes / Edição
  const [selectedProjeto, setSelectedProjeto] = useState<ProjetoInfra | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo_projeto: '',
    tipo_projeto: '',
    status: '',
    responsavel_tecnico_id: '',
    data_inicio_prevista: '',
    data_conclusao: '',
    observacoes_projeto: '',
  })

  // Modal IA (Gerador de Escopo Técnico)
  const [showIAModal, setShowIAModal] = useState(false)

  // Modal Imprimir Ficha de Projeto
  const [showPrintModal, setShowPrintModal] = useState(false)

  // Carregar Projetos
  const loadProjetos = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT 
          p.id,
          p.cliente_id,
          c.nome_fantasia_ou_razao as cliente_nome,
          c.documento as cliente_documento,
          p.titulo_projeto,
          p.tipo_projeto,
          p.status,
          p.responsavel_tecnico_id,
          t.nome as tecnico_nome,
          p.data_inicio_prevista,
          p.data_conclusao,
          p.observacoes_projeto,
          p.created_at
        FROM projetos_infraestrutura p
        JOIN clientes c ON c.id = p.cliente_id
        LEFT JOIN tecnicos t ON t.id = p.responsavel_tecnico_id
        ORDER BY p.data_inicio_prevista ASC NULLS LAST, p.created_at DESC
      `
      setProjetos(
        data.map((r: any) => ({
          ...r,
          data_inicio_prevista: toDateInputString(r.data_inicio_prevista),
          data_conclusao: toDateInputString(r.data_conclusao),
        }))
      )
    } catch (err: any) {
      console.error('Erro ao carregar projetos:', err)
      setErrorBanner('Erro ao buscar projetos de infraestrutura no banco de dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Carregar Clientes e Técnicos
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
    loadProjetos()
    loadAuxData()
  }, [loadProjetos, loadAuxData])

  // Salvar Novo Projeto
  const handleCriarProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novoForm.cliente_id) {
      setErrorBanner('Selecione o cliente contratante.')
      return
    }

    if (!novoForm.titulo_projeto.trim()) {
      setErrorBanner('Informe o título do projeto.')
      return
    }

    try {
      setSavingNovo(true)
      await sql`
        INSERT INTO projetos_infraestrutura (
          cliente_id,
          titulo_projeto,
          tipo_projeto,
          status,
          responsavel_tecnico_id,
          data_inicio_prevista,
          data_conclusao,
          observacoes_projeto
        )
        VALUES (
          ${novoForm.cliente_id},
          ${novoForm.titulo_projeto.trim()},
          ${novoForm.tipo_projeto},
          ${novoForm.status},
          ${novoForm.responsavel_tecnico_id || null},
          ${novoForm.data_inicio_prevista || null},
          ${novoForm.data_conclusao || null},
          ${novoForm.observacoes_projeto.trim() || null}
        )
      `

      setSuccessBanner(`Projeto "${novoForm.titulo_projeto.trim()}" cadastrado com sucesso!`)
      setShowNovoModal(false)
      setNovoForm({
        cliente_id: '',
        titulo_projeto: '',
        tipo_projeto: 'Cabeamento Estruturado',
        status: 'Planejamento',
        responsavel_tecnico_id: tecnicoLogado?.id || '',
        data_inicio_prevista: new Date().toISOString().split('T')[0],
        data_conclusao: '',
        observacoes_projeto: '',
      })
      await loadProjetos()
    } catch (err: any) {
      console.error('Erro ao cadastrar projeto:', err)
      setErrorBanner(err.message || 'Erro ao registrar novo projeto.')
    } finally {
      setSavingNovo(false)
    }
  }

  // Abrir Modal de Edição
  const handleOpenEdit = (p: ProjetoInfra) => {
    setSelectedProjeto(p)
    setEditForm({
      titulo_projeto: p.titulo_projeto,
      tipo_projeto: p.tipo_projeto,
      status: p.status,
      responsavel_tecnico_id: p.responsavel_tecnico_id || '',
      data_inicio_prevista: toDateInputString(p.data_inicio_prevista),
      data_conclusao: toDateInputString(p.data_conclusao),
      observacoes_projeto: p.observacoes_projeto || '',
    })
  }

  // Salvar Edição do Projeto
  const handleUpdateProjeto = async () => {
    if (!selectedProjeto) return

    try {
      setSavingEdit(true)
      const isConcluido = editForm.status === 'Concluído'
      const dataConclusaoFinal = isConcluido
        ? editForm.data_conclusao || new Date().toISOString().split('T')[0]
        : editForm.data_conclusao || null

      await sql`
        UPDATE projetos_infraestrutura
        SET
          titulo_projeto = ${editForm.titulo_projeto.trim()},
          tipo_projeto = ${editForm.tipo_projeto},
          status = ${editForm.status},
          responsavel_tecnico_id = ${editForm.responsavel_tecnico_id || null},
          data_inicio_prevista = ${editForm.data_inicio_prevista || null},
          data_conclusao = ${dataConclusaoFinal},
          observacoes_projeto = ${editForm.observacoes_projeto.trim() || null}
        WHERE id = ${selectedProjeto.id}
      `

      setSuccessBanner(`Projeto "${editForm.titulo_projeto}" atualizado com sucesso!`)
      setSelectedProjeto(null)
      await loadProjetos()
    } catch (err: any) {
      console.error('Erro ao salvar projeto:', err)
      setErrorBanner(err.message || 'Erro ao atualizar dados do projeto.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Aplicar dados da IA no Escopo
  const handleApplyIAEscopo = (dados: LaudoIAData) => {
    const textoGerado = [
      dados.diagnostico_tecnico ? `DIAGNÓSTICO E ESCOPO:\n${dados.diagnostico_tecnico}` : '',
      dados.servicos_recomendados?.length ? `\n\nETAPAS DE EXECUÇÃO:\n• ${dados.servicos_recomendados.join('\n• ')}` : '',
      dados.materiais_ou_pecas_sugeridas?.length ? `\n\nMATERIAIS E EQUIPAMENTOS SUGERIDOS:\n• ${dados.materiais_ou_pecas_sugeridas.join('\n• ')}` : '',
      dados.termos_garantia ? `\n\nGARANTIA & PADRÃO NORMATIVO:\n${dados.termos_garantia}` : '',
    ]
      .filter(Boolean)
      .join('')

    setEditForm((prev) => ({
      ...prev,
      observacoes_projeto: prev.observacoes_projeto ? `${prev.observacoes_projeto}\n\n${textoGerado}` : textoGerado,
    }))
    setShowIAModal(false)
    setSuccessBanner('Escopo de Projeto gerado por IA adicionado com sucesso!')
  }

  // Badges de Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Planejamento':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <Clock className="w-3 h-3 text-purple-400" />
            Planejamento
          </span>
        )
      case 'Aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            Aprovado
          </span>
        )
      case 'Em Execução':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
            Em Execução
          </span>
        )
      case 'Pendente Validação':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Pendente Validação
          </span>
        )
      case 'Concluído':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Concluído
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
  const filteredProjetos = useMemo(() => {
    return projetos.filter((p) => {
      const q = searchTerm.toLowerCase()
      const matchText =
        p.titulo_projeto.toLowerCase().includes(q) ||
        p.cliente_nome.toLowerCase().includes(q) ||
        p.tipo_projeto.toLowerCase().includes(q) ||
        (p.tecnico_nome && p.tecnico_nome.toLowerCase().includes(q)) ||
        (p.observacoes_projeto && p.observacoes_projeto.toLowerCase().includes(q))

      if (!matchText) return false
      if (statusFilter !== 'todos' && p.status !== statusFilter) return false
      if (tipoFilter !== 'todos' && p.tipo_projeto !== tipoFilter) return false
      return true
    })
  }, [projetos, searchTerm, statusFilter, tipoFilter])

  // Contadores
  const totalExecucao = projetos.filter((p) => p.status === 'Em Execução').length
  const totalPlanejamento = projetos.filter((p) => p.status === 'Planejamento' || p.status === 'Aprovado').length
  const totalConcluidos = projetos.filter((p) => p.status === 'Concluído').length

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Engenharia & Obras de Rede
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Projetos de Infraestrutura
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Acompanhe a implantação de redes corporativas, cabeamento estruturado, racks e sistemas de CFTV IP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadProjetos()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar projetos"
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
            <span>Novo Projeto</span>
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

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setStatusFilter('todos')
            setTipoFilter('todos')
          }}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'todos' ? 'border-cyan-500/50 bg-slate-800/40' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Projetos</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{projetos.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Projetos cadastrados na base</p>
        </div>

        <div
          onClick={() => setStatusFilter('Em Execução')}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'Em Execução' ? 'border-amber-500/50 bg-amber-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Em Execução</p>
              <h3 className="text-3xl font-extrabold text-amber-300 mt-1">{totalExecucao}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Obras ativas no cliente</p>
        </div>

        <div
          onClick={() => setStatusFilter('Planejamento')}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'Planejamento' ? 'border-purple-500/50 bg-purple-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Planejamento / Aprovados</p>
              <h3 className="text-3xl font-extrabold text-purple-300 mt-1">{totalPlanejamento}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Projetos a iniciar</p>
        </div>

        <div
          onClick={() => setStatusFilter('Concluído')}
          className={`bg-slate-900/60 border rounded-2xl p-5 cursor-pointer transition ${
            statusFilter === 'Concluído' ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Concluídos</p>
              <h3 className="text-3xl font-extrabold text-emerald-300 mt-1">{totalConcluidos}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Projetos entregues e certificados</p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título, cliente, tipo ou responsável..."
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
              {STATUS_PROJETO_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todos">Tipo: Todos os Projetos</option>
              {TIPOS_PROJETO_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>
            Exibindo <strong className="text-cyan-400 font-mono">{filteredProjetos.length}</strong> de {projetos.length} projetos
          </span>
          {(searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todos')
                setTipoFilter('todos')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Projetos */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando projetos de infraestrutura...</span>
          </div>
        ) : filteredProjetos.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Nenhum projeto encontrado</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Crie um novo projeto de infraestrutura ou redefina os filtros de busca.
            </p>
            <button
              onClick={() => setShowNovoModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Projeto</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Projeto</th>
                  <th className="py-3.5 px-6">Cliente</th>
                  <th className="py-3.5 px-6">Tipo</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Responsável Técnico</th>
                  <th className="py-3.5 px-6">Início Previsto</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProjetos.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenEdit(p)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 max-w-xs">
                      <span className="font-semibold text-white block truncate">{p.titulo_projeto}</span>
                      {p.observacoes_projeto && (
                        <span className="text-xs text-slate-400 block truncate mt-0.5">
                          {p.observacoes_projeto}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{p.cliente_nome}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-cyan-300 border border-slate-700">
                        {p.tipo_projeto}
                      </span>
                    </td>

                    <td className="py-4 px-6">{getStatusBadge(p.status)}</td>

                    <td className="py-4 px-6 text-xs text-slate-300">
                      {p.tecnico_nome ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          {p.tecnico_nome}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Não atribuído</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-xs font-mono text-slate-400">
                      {p.data_inicio_prevista
                        ? new Date(p.data_inicio_prevista).toLocaleDateString('pt-BR')
                        : '--/--'}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(p)
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
      {/* MODAL: NOVO PROJETO DE INFRAESTRUTURA                          */}
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
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Novo Projeto de Infraestrutura</h3>
                <p className="text-xs text-slate-400">
                  Planejamento e implantação técnica de infraestrutura de TI
                </p>
              </div>
            </div>

            <form onSubmit={handleCriarProjeto} className="space-y-4">
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
                  Título do Projeto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cabeamento Estruturado Cat6 - Galpão Principal (48 Pontos)"
                  value={novoForm.titulo_projeto}
                  onChange={(e) => setNovoForm({ ...novoForm, titulo_projeto: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tipo de Projeto *
                  </label>
                  <select
                    value={novoForm.tipo_projeto}
                    onChange={(e) => setNovoForm({ ...novoForm, tipo_projeto: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {TIPOS_PROJETO_OPTIONS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Status Inicial *
                  </label>
                  <select
                    value={novoForm.status}
                    onChange={(e) => setNovoForm({ ...novoForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_PROJETO_OPTIONS.map((st) => (
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
                    Responsável Técnico
                  </label>
                  <select
                    value={novoForm.responsavel_tecnico_id}
                    onChange={(e) =>
                      setNovoForm({ ...novoForm, responsavel_tecnico_id: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {tecnicos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.nivel_acesso})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data de Início Prevista
                  </label>
                  <input
                    type="date"
                    value={novoForm.data_inicio_prevista}
                    onChange={(e) =>
                      setNovoForm({ ...novoForm, data_inicio_prevista: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Observações e Escopo Inicial
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva o escopo da infraestrutura, equipamentos envolvidos, switches, racks, metragem e metas do projeto..."
                  value={novoForm.observacoes_projeto}
                  onChange={(e) =>
                    setNovoForm({ ...novoForm, observacoes_projeto: e.target.value })
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
                      <span>Cadastrar Projeto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VER / EDITAR PROJETO DE INFRAESTRUTURA                  */}
      {/* ============================================================== */}
      {selectedProjeto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedProjeto(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedProjeto.titulo_projeto}</h3>
                  <p className="text-xs text-slate-400">
                    Cliente: <strong className="text-white">{selectedProjeto.cliente_nome}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ficha do Projeto</span>
                </button>

                <button
                  onClick={() => setShowIAModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gerar Escopo com IA</span>
                </button>
              </div>
            </div>

            <div className="py-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Título do Projeto
                </label>
                <input
                  type="text"
                  value={editForm.titulo_projeto}
                  onChange={(e) => setEditForm({ ...editForm, titulo_projeto: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tipo de Projeto
                  </label>
                  <select
                    value={editForm.tipo_projeto}
                    onChange={(e) => setEditForm({ ...editForm, tipo_projeto: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {TIPOS_PROJETO_OPTIONS.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {STATUS_PROJETO_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Responsável Técnico
                  </label>
                  <select
                    value={editForm.responsavel_tecnico_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, responsavel_tecnico_id: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data de Início Prevista
                  </label>
                  <input
                    type="date"
                    value={editForm.data_inicio_prevista}
                    onChange={(e) =>
                      setEditForm({ ...editForm, data_inicio_prevista: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Data de Conclusão / Entrega
                  </label>
                  <input
                    type="date"
                    value={editForm.data_conclusao}
                    onChange={(e) => setEditForm({ ...editForm, data_conclusao: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Observações, Especificações e Escopo Técnico
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowIAModal(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Expandir com IA
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={editForm.observacoes_projeto}
                  onChange={(e) =>
                    setEditForm({ ...editForm, observacoes_projeto: e.target.value })
                  }
                  placeholder="Detalhamento técnico do projeto..."
                  className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedProjeto(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleUpdateProjeto}
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

      {/* MODAL IA: GERAR ESCOPO DO PROJETO */}
      {showIAModal && selectedProjeto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl w-full max-w-3xl shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowIAModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <GeradorLaudoIA
              tipo="escopo_projeto"
              contexto={{
                clienteNome: selectedProjeto.cliente_nome,
                tipoServico: editForm.tipo_projeto,
                relatoProblemaOuDemanda: editForm.titulo_projeto,
                historico: editForm.observacoes_projeto,
              }}
              onSave={handleApplyIAEscopo}
              onCancel={() => setShowIAModal(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL: FICHA DO PROJETO / IMPRESSÃO */}
      {showPrintModal && selectedProjeto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:w-full print:rounded-none">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Ficha Técnica do Projeto de Infraestrutura
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
                <p className="text-xs text-slate-600">
                  Infraestrutura de TI, Redes Corporativas & CFTV IP
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-blue-700 block">
                  PROJETO TÉCNICO
                </span>
                <span className="text-xs text-slate-600 block">
                  Status: <strong>{editForm.status}</strong>
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6 space-y-2">
              <p><strong>Projeto:</strong> {editForm.titulo_projeto}</p>
              <p><strong>Cliente:</strong> {selectedProjeto.cliente_nome}</p>
              <p><strong>Tipo de Obra:</strong> {editForm.tipo_projeto}</p>
              <p><strong>Início Previsto:</strong> {editForm.data_inicio_prevista || 'Não informado'}</p>
              <p><strong>Responsável:</strong> {tecnicos.find((t) => t.id === editForm.responsavel_tecnico_id)?.nome || 'RC Tech'}</p>
            </div>

            <div className="text-xs mb-8">
              <strong className="block text-slate-900 uppercase mb-2 font-bold">Escopo e Especificações Técnicas:</strong>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                {editForm.observacoes_projeto || 'Nenhum detalhamento registrado.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">Responsável Técnico RC Tech</span>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1"></div>
                <span className="font-semibold text-slate-800 block">{selectedProjeto.cliente_nome}</span>
                <span className="text-[11px] text-slate-500">Aprovação do Cliente</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

