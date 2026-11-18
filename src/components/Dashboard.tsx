import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { sql } from '@/lib/db'
import { ClientesModule } from './ClientesModule'
import { UsuariosModule } from './UsuariosModule'
import { OrdensServicoModule } from './OrdensServicoModule'
import { ProjetosInfraModule } from './ProjetosInfraModule'
import { VisitasTecnicasModule } from './VisitasTecnicasModule'
import { CatalogoServicosModule } from './CatalogoServicosModule'
import { ContratosModule } from './ContratosModule'
import { ModuleErrorBoundary } from './ErrorBoundary'
import {
  LayoutDashboard,
  Users,
  Wrench,
  Server,
  Calendar,
  Layers,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
  MapPin,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Radio,
  Wifi,
  Video,
  User,
  Info,
  Menu,
  X,
  UserCheck
} from 'lucide-react'

// Interfaces dos dados do Dashboard
export interface OSAbertaSummary {
  total: number
  emAnalise: number
  emExecucao: number
  aguardandoPecas: number
  abertas: number
}

export interface VisitaHoje {
  id: string
  data_agendamento: string
  status_visita: string
  motivo_visita: string
  cliente_id: string
  cliente_nome: string
  tecnico_nome: string
  ordem_servico_id: string | null
  projeto_id: string | null
  km_rodado: number | null
}

export interface ProjetoAtivo {
  id: string
  titulo_projeto: string
  tipo_projeto: string
  status: string
  cliente_nome: string
  tecnico_nome: string
  data_inicio_prevista: string | null
}

export interface OSUrgenteOuAtrasada {
  id: string
  numero_os: number
  tipo_servico: string
  status: string
  prioridade: string
  relato_problema: string
  data_previsao: string | null
  data_abertura: string
  cliente_nome: string
  tecnico_nome: string
  isAtrasada: boolean
}

type MenuSection = 'dashboard' | 'clientes' | 'os' | 'projetos' | 'visitas' | 'catalogo' | 'contratos' | 'usuarios'

const VALID_MENUS: MenuSection[] = [
  'dashboard',
  'clientes',
  'os',
  'projetos',
  'visitas',
  'catalogo',
  'contratos',
  'usuarios',
]

const getInitialMenu = (): MenuSection => {
  try {
    const hash = window.location.hash.replace('#', '') as MenuSection
    if (VALID_MENUS.includes(hash)) {
      return hash
    }
    const saved = localStorage.getItem('rctech_active_menu') as MenuSection
    if (VALID_MENUS.includes(saved)) {
      return saved
    }
  } catch {
    // fallback
  }
  return 'dashboard'
}

export const Dashboard: React.FC = () => {
  const { session, logout } = useAuth()
  const tecnico = session?.tecnico
  const user = session?.user

  const [activeMenu, setActiveMenuState] = useState<MenuSection>(getInitialMenu)

  const setActiveMenu = (menu: MenuSection) => {
    setActiveMenuState(menu)
    try {
      localStorage.setItem('rctech_active_menu', menu)
      window.location.hash = menu
    } catch {
      // ignore
    }
  }

  // Sincroniza hash na URL para restaurar tela após refresh (F5) ou voltar no histórico
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as MenuSection
      if (VALID_MENUS.includes(hash)) {
        setActiveMenuState(hash)
        localStorage.setItem('rctech_active_menu', hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())

  // Dados carregados do Neon
  const [osSummary, setOsSummary] = useState<OSAbertaSummary>({
    total: 0,
    emAnalise: 0,
    emExecucao: 0,
    aguardandoPecas: 0,
    abertas: 0,
  })
  const [visitasHoje, setVisitasHoje] = useState<VisitaHoje[]>([])
  const [projetosAtivos, setProjetosAtivos] = useState<ProjetoAtivo[]>([])
  const [osUrgentes, setOsUrgentes] = useState<OSUrgenteOuAtrasada[]>([])

  // Modal / Feedback de Detalhes ao Clicar em um item de OS ou Projeto
  const [selectedItem, setSelectedItem] = useState<{
    tipo: 'os' | 'projeto' | 'visita'
    titulo: string
    detalhes: Record<string, string | number | null | undefined>
  } | null>(null)

  const isAdmin = tecnico?.nivel_acesso?.toLowerCase() === 'admin'
  const tecnicoId = tecnico?.id

  // Carrega dados do Neon com respeito a RLS / Nível de Acesso
  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true)

      // 1. OS Abertas / Em Andamento
      // Status: 'Aberta', 'Em Análise', 'Em Execução', 'Aguardando Peças'
      let osQuery
      if (isAdmin || !tecnicoId) {
        osQuery = await sql`
          SELECT 
            status, 
            COUNT(*)::int as qtd
          FROM ordens_servico
          WHERE status IN ('Aberta', 'Em Análise', 'Em Execução', 'Aguardando Peças')
          GROUP BY status
        `
      } else {
        osQuery = await sql`
          SELECT 
            status, 
            COUNT(*)::int as qtd
          FROM ordens_servico
          WHERE status IN ('Aberta', 'Em Análise', 'Em Execução', 'Aguardando Peças')
            AND tecnico_id = ${tecnicoId}
          GROUP BY status
        `
      }

      let totalOS = 0
      let emAnalise = 0
      let emExecucao = 0
      let aguardandoPecas = 0
      let abertas = 0

      for (const row of osQuery) {
        const count = Number(row.qtd) || 0
        totalOS += count
        if (row.status === 'Aberta') abertas = count
        if (row.status === 'Em Análise') emAnalise = count
        if (row.status === 'Em Execução') emExecucao = count
        if (row.status === 'Aguardando Peças') aguardandoPecas = count
      }

      setOsSummary({
        total: totalOS,
        abertas,
        emAnalise,
        emExecucao,
        aguardandoPecas,
      })

      // 2. Visitas Técnicas de Hoje
      let visitasQuery
      if (isAdmin || !tecnicoId) {
        visitasQuery = await sql`
          SELECT 
            v.id,
            v.data_agendamento,
            v.status_visita,
            v.motivo_visita,
            v.cliente_id,
            v.ordem_servico_id,
            v.projeto_id,
            v.km_rodado,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome
          FROM visitas_tecnicas v
          JOIN clientes c ON c.id = v.cliente_id
          LEFT JOIN tecnicos t ON t.id = v.tecnico_id
          WHERE DATE(v.data_agendamento AT TIME ZONE 'UTC') = CURRENT_DATE
             OR DATE(v.data_agendamento) = CURRENT_DATE
          ORDER BY v.data_agendamento ASC
        `
      } else {
        visitasQuery = await sql`
          SELECT 
            v.id,
            v.data_agendamento,
            v.status_visita,
            v.motivo_visita,
            v.cliente_id,
            v.ordem_servico_id,
            v.projeto_id,
            v.km_rodado,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome
          FROM visitas_tecnicas v
          JOIN clientes c ON c.id = v.cliente_id
          LEFT JOIN tecnicos t ON t.id = v.tecnico_id
          WHERE (DATE(v.data_agendamento AT TIME ZONE 'UTC') = CURRENT_DATE OR DATE(v.data_agendamento) = CURRENT_DATE)
            AND v.tecnico_id = ${tecnicoId}
          ORDER BY v.data_agendamento ASC
        `
      }

      setVisitasHoje(
        visitasQuery.map((v) => ({
          id: v.id,
          data_agendamento: v.data_agendamento,
          status_visita: v.status_visita,
          motivo_visita: v.motivo_visita,
          cliente_id: v.cliente_id,
          cliente_nome: v.cliente_nome || 'Cliente não informado',
          tecnico_nome: v.tecnico_nome || 'Não atribuído',
          ordem_servico_id: v.ordem_servico_id,
          projeto_id: v.projeto_id,
          km_rodado: v.km_rodado ? Number(v.km_rodado) : null,
        }))
      )

      // 3. Projetos de Infraestrutura Ativos (status = 'Em Execução')
      let projetosQuery
      if (isAdmin || !tecnicoId) {
        projetosQuery = await sql`
          SELECT 
            p.id,
            p.titulo_projeto,
            p.tipo_projeto,
            p.status,
            p.data_inicio_prevista,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome
          FROM projetos_infraestrutura p
          JOIN clientes c ON c.id = p.cliente_id
          LEFT JOIN tecnicos t ON t.id = p.responsavel_tecnico_id
          WHERE p.status = 'Em Execução'
          ORDER BY p.data_inicio_prevista ASC NULLS LAST
        `
      } else {
        projetosQuery = await sql`
          SELECT 
            p.id,
            p.titulo_projeto,
            p.tipo_projeto,
            p.status,
            p.data_inicio_prevista,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome
          FROM projetos_infraestrutura p
          JOIN clientes c ON c.id = p.cliente_id
          LEFT JOIN tecnicos t ON t.id = p.responsavel_tecnico_id
          WHERE p.status = 'Em Execução'
            AND p.responsavel_tecnico_id = ${tecnicoId}
          ORDER BY p.data_inicio_prevista ASC NULLS LAST
        `
      }

      setProjetosAtivos(
        projetosQuery.map((p) => ({
          id: p.id,
          titulo_projeto: p.titulo_projeto,
          tipo_projeto: p.tipo_projeto,
          status: p.status,
          cliente_nome: p.cliente_nome || 'Cliente não informado',
          tecnico_nome: p.tecnico_nome || 'Equipe Geral',
          data_inicio_prevista: p.data_inicio_prevista,
        }))
      )

      // 4. OS Urgentes / Atrasadas
      // Prioridade 'Alta' ou 'Urgente', ou data_previsao < NOW() e status não concluído nem cancelado
      let osUrgentesQuery
      if (isAdmin || !tecnicoId) {
        osUrgentesQuery = await sql`
          SELECT 
            o.id,
            o.numero_os,
            o.tipo_servico,
            o.status,
            o.prioridade,
            o.relato_problema,
            o.data_previsao,
            o.data_abertura,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome,
            CASE 
              WHEN o.data_previsao IS NOT NULL AND o.data_previsao < NOW() AND o.status NOT IN ('Concluída', 'Cancelada') 
              THEN true 
              ELSE false 
            END as is_atrasada
          FROM ordens_servico o
          JOIN clientes c ON c.id = o.cliente_id
          LEFT JOIN tecnicos t ON t.id = o.tecnico_id
          WHERE o.status NOT IN ('Concluída', 'Cancelada')
            AND (
              o.prioridade IN ('Alta', 'Urgente')
              OR (o.data_previsao IS NOT NULL AND o.data_previsao < NOW())
            )
          ORDER BY 
            is_atrasada DESC,
            CASE WHEN o.prioridade = 'Urgente' THEN 1 WHEN o.prioridade = 'Alta' THEN 2 ELSE 3 END,
            o.data_previsao ASC NULLS LAST
          LIMIT 10
        `
      } else {
        osUrgentesQuery = await sql`
          SELECT 
            o.id,
            o.numero_os,
            o.tipo_servico,
            o.status,
            o.prioridade,
            o.relato_problema,
            o.data_previsao,
            o.data_abertura,
            c.nome_fantasia_ou_razao as cliente_nome,
            t.nome as tecnico_nome,
            CASE 
              WHEN o.data_previsao IS NOT NULL AND o.data_previsao < NOW() AND o.status NOT IN ('Concluída', 'Cancelada') 
              THEN true 
              ELSE false 
            END as is_atrasada
          FROM ordens_servico o
          JOIN clientes c ON c.id = o.cliente_id
          LEFT JOIN tecnicos t ON t.id = o.tecnico_id
          WHERE o.status NOT IN ('Concluída', 'Cancelada')
            AND o.tecnico_id = ${tecnicoId}
            AND (
              o.prioridade IN ('Alta', 'Urgente')
              OR (o.data_previsao IS NOT NULL AND o.data_previsao < NOW())
            )
          ORDER BY 
            is_atrasada DESC,
            CASE WHEN o.prioridade = 'Urgente' THEN 1 WHEN o.prioridade = 'Alta' THEN 2 ELSE 3 END,
            o.data_previsao ASC NULLS LAST
          LIMIT 10
        `
      }

      setOsUrgentes(
        osUrgentesQuery.map((o) => ({
          id: o.id,
          numero_os: o.numero_os,
          tipo_servico: o.tipo_servico,
          status: o.status,
          prioridade: o.prioridade || 'Média',
          relato_problema: o.relato_problema,
          data_previsao: o.data_previsao,
          data_abertura: o.data_abertura,
          cliente_nome: o.cliente_nome || 'Cliente não informado',
          tecnico_nome: o.tecnico_nome || 'Não atribuído',
          isAtrasada: Boolean(o.is_atrasada),
        }))
      )

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAdmin, tecnicoId])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Formatação de horários e datas
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return '--:--'
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '--/--'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('pt-BR')
    } catch {
      return '--/--'
    }
  }

  // Itens do Menu Lateral Requeridos
  const baseMenuItems = [
    { id: 'dashboard' as MenuSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes' as MenuSection, label: 'Clientes', icon: Users },
    { id: 'os' as MenuSection, label: 'Ordens de Serviço (OS)', icon: Wrench, badge: osSummary.total },
    { id: 'projetos' as MenuSection, label: 'Projetos de Infra', icon: Server, badge: projetosAtivos.length },
    { id: 'visitas' as MenuSection, label: 'Visitas Técnicas', icon: Calendar, badge: visitasHoje.length },
    { id: 'catalogo' as MenuSection, label: 'Catálogo / Serviços', icon: Layers },
    { id: 'contratos' as MenuSection, label: 'Contratos', icon: FileCheck2 },
  ]

  const navMenuItems = isAdmin
    ? [
        ...baseMenuItems,
        { id: 'usuarios' as MenuSection, label: 'Gestão de Usuários', icon: UserCheck },
      ]
    : baseMenuItems

  // Render do conteúdo do item selecionado / modal
  const renderDetailsModal = () => {
    if (!selectedItem) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              {selectedItem.tipo === 'os' ? (
                <Wrench className="w-5 h-5" />
              ) : selectedItem.tipo === 'projeto' ? (
                <Server className="w-5 h-5" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 block">
                Detalhes do Registro
              </span>
              <h3 className="text-lg font-bold text-white">{selectedItem.titulo}</h3>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-sm mb-6">
            {Object.entries(selectedItem.detalhes).map(([key, val]) => (
              <div key={key} className="flex justify-between items-start gap-4 border-b border-slate-800/50 pb-2 last:border-b-0 last:pb-0">
                <span className="text-slate-400 font-medium capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="text-slate-200 font-mono text-right font-medium">
                  {val !== null && val !== undefined && val !== '' ? String(val) : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSelectedItem(null)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                if (selectedItem.tipo === 'os') setActiveMenu('os')
                if (selectedItem.tipo === 'projeto') setActiveMenu('projetos')
                if (selectedItem.tipo === 'visita') setActiveMenu('visitas')
                setSelectedItem(null)
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition flex items-center gap-1.5"
            >
              <span>Abrir Módulo Completo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* ============================================================== */}
      {/* MENU LATERAL FIXO (DESKTOP E RESPONSIVO)                        */}
      {/* ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shrink-0 h-screen sticky top-0 z-40">
        {/* Topo do Menu com Logo "RC Tech" */}
        <div className="h-18 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-600/20 to-indigo-600/30 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <Wifi className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              RC <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Tech</span>
            </span>
            <span className="text-[10px] text-cyan-400/80 font-mono tracking-widest uppercase">
              TI & INFRAESTRUTURA
            </span>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Navegação Principal
          </div>
          {navMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 via-blue-600/15 to-transparent text-cyan-300 border-l-4 border-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Info do Técnico Logado no Rodapé da Sidebar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {tecnico?.nome || user?.name || user?.email}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] font-mono text-cyan-400 capitalize truncate">
                  {tecnico?.nivel_acesso || 'Técnico'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sair do sistema"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* HEADER MOBILE                                                  */}
      {/* ============================================================== */}
      <header className="md:hidden border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-bold text-white text-lg">
            RC <span className="text-cyan-400">Tech</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData()}
            className="p-2 text-slate-400 hover:text-white"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 p-6 flex flex-col justify-between backdrop-blur-md">
          <div>
            <div className="flex justify-between items-center pb-6 border-b border-slate-800">
              <span className="font-bold text-white text-lg">Menu do Sistema</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="mt-6 space-y-2">
              {navMenuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeMenu === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMenu(item.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-cyan-400" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="text-xs bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-white">{tecnico?.nome || user?.name}</p>
              <p className="text-xs text-cyan-400 font-mono">{tecnico?.nivel_acesso || 'técnico'}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-rose-400 text-sm font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ÁREA PRINCIPAL DO DASHBOARD                                    */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra Superior / Breadcrumbs & Ações Rápidas */}
        <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Módulo Ativo:
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              {navMenuItems.find((m) => m.id === activeMenu)?.label || 'Dashboard'}
            </span>
            {isAdmin ? (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                Visão Geral (Admin)
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono">
                Visão Técnico
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Atualizado: {formatTime(lastUpdated.toISOString())}</span>
            </div>

            <button
              onClick={() => loadDashboardData()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
              title="Recarregar dados do Neon DB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {/* Conteúdo dinâmico: Renderização dos Módulos Operacionais com Proteção contra Falhas */}
        <ModuleErrorBoundary
          key={activeMenu}
          moduleName={navMenuItems.find((m) => m.id === activeMenu)?.label || activeMenu}
          onReset={() => loadDashboardData()}
        >
          {activeMenu === 'clientes' ? (
            <ClientesModule />
          ) : activeMenu === 'os' ? (
            <OrdensServicoModule />
          ) : activeMenu === 'projetos' ? (
            <ProjetosInfraModule />
          ) : activeMenu === 'visitas' ? (
            <VisitasTecnicasModule />
          ) : activeMenu === 'catalogo' ? (
            <CatalogoServicosModule />
          ) : activeMenu === 'contratos' ? (
            <ContratosModule />
          ) : activeMenu === 'usuarios' && isAdmin ? (
            <UsuariosModule />
          ) : (
            /* ============================================================== */
            /* TELA PRINCIPAL DO DASHBOARD                                   */
            /* ============================================================== */
            <div className="p-6 md:p-8 space-y-8 flex-1">
            {/* Banner Superior com Atalhos Rápidos */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-3">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                    <span>Neon Database em Tempo Real • Políticas RLS Ativas</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Painel Operacional de TI e Infraestrutura
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                    Acompanhe em tempo real o fluxo de bancada, manutenções, chamados urgentes e execução técnica de infraestrutura.
                  </p>
                </div>

                {/* Atalhos Rápidos */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setActiveMenu('os')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-white border border-slate-700 hover:border-cyan-500/40 transition shadow-sm cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Nova OS</span>
                  </button>
                  <button
                    onClick={() => setActiveMenu('visitas')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-white border border-slate-700 hover:border-blue-500/40 transition shadow-sm cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Agendar Visita</span>
                  </button>
                  <button
                    onClick={() => setActiveMenu('projetos')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-white border border-slate-700 hover:border-indigo-500/40 transition shadow-sm cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Novo Projeto</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* OS 4 CARDS PRINCIPAIS DE MÉTRICAS (PROMPT 3)                   */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* CARD 1: OS Abertas / Em Andamento */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-cyan-500/40 transition-all shadow-lg flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      OS em Andamento
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Wrench className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {loading ? '...' : osSummary.total}
                    </span>
                    <span className="text-xs text-slate-400">chamados</span>
                  </div>

                  {/* Sub-status pills */}
                  <div className="grid grid-cols-2 gap-1.5 mt-4 text-[11px]">
                    <div className="bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Abertas:</span>
                      <span className="font-bold text-cyan-300">{osSummary.abertas}</span>
                    </div>
                    <div className="bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Em Análise:</span>
                      <span className="font-bold text-blue-400">{osSummary.emAnalise}</span>
                    </div>
                    <div className="bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Execução:</span>
                      <span className="font-bold text-amber-400">{osSummary.emExecucao}</span>
                    </div>
                    <div className="bg-slate-950/60 px-2 py-1.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Aguard. Peça:</span>
                      <span className="font-bold text-rose-400">{osSummary.aguardandoPecas}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMenu('os')}
                  className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center justify-between group/btn cursor-pointer"
                >
                  <span>Ver todas as ordens de serviço</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition" />
                </button>
              </div>

              {/* CARD 2: Visitas Técnicas Hoje (Contador + Resumo) */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-blue-500/40 transition-all shadow-lg flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Visitas Técnicas Hoje
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {loading ? '...' : visitasHoje.length}
                    </span>
                    <span className="text-xs text-slate-400">agendamentos</span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    {visitasHoje.length > 0
                      ? `${visitasHoje.length} atendimento(s) em campo agendado(s) para a data de hoje.`
                      : 'Nenhuma visita agendada para hoje no momento.'}
                  </p>
                </div>

                <button
                  onClick={() => setActiveMenu('visitas')}
                  className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-between group/btn cursor-pointer"
                >
                  <span>Acessar agenda de visitas</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition" />
                </button>
              </div>

              {/* CARD 3: Projetos de Infraestrutura Ativos */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-indigo-500/40 transition-all shadow-lg flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      Projetos Ativos
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Server className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">
                      {loading ? '...' : projetosAtivos.length}
                    </span>
                    <span className="text-xs text-slate-400">em execução</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 text-cyan-400">
                      <Wifi className="w-3 h-3" /> Wi-Fi
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-blue-400">
                      <Video className="w-3 h-3" /> CFTV
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-indigo-400">
                      <Layers className="w-3 h-3" /> Redes
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMenu('projetos')}
                  className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-between group/btn cursor-pointer"
                >
                  <span>Gerenciar projetos de infra</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition" />
                </button>
              </div>

              {/* CARD 4: OS Urgentes / Atrasadas */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 hover:border-rose-500/40 transition-all shadow-lg flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                      OS Urgentes / Atrasadas
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-rose-400">
                      {loading ? '...' : osUrgentes.length}
                    </span>
                    <span className="text-xs text-slate-400">requer atenção</span>
                  </div>

                  <p className="text-[11px] text-rose-300/80 mt-2 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Prioridade máxima ou prazo vencido</span>
                  </p>
                </div>

                <button
                  onClick={() => setActiveMenu('os')}
                  className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center justify-between group/btn cursor-pointer"
                >
                  <span>Visualizar chamados críticos</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition" />
                </button>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SEÇÕES DE DETALHAMENTO: VISITAS HOJE & OS URGENTES             */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CARD 2 (DETALHADO) — Visitas Técnicas Hoje */}
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 flex flex-col shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Visitas Técnicas Hoje
                      </h2>
                      <p className="text-xs text-slate-400">
                        Atendimentos e vistorias agendadas com clientes
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
                    {visitasHoje.length} agendada(s)
                  </span>
                </div>

                <div className="mt-4 flex-1">
                  {visitasHoje.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">
                        Nenhuma visita técnica agendada para hoje
                      </p>
                      <span className="text-xs text-slate-400 mt-1">
                        Utilize o módulo de Visitas Técnicas para agendar novos atendimentos.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visitasHoje.map((v) => (
                        <div
                          key={v.id}
                          onClick={() =>
                            setSelectedItem({
                              tipo: 'visita',
                              titulo: `Visita Técnica - ${v.cliente_nome}`,
                              detalhes: {
                                cliente: v.cliente_nome,
                                horario: formatTime(v.data_agendamento),
                                status: v.status_visita,
                                motivo: v.motivo_visita,
                                tecnico: v.tecnico_nome,
                                os_vinculada: v.ordem_servico_id || 'Nenhuma',
                                projeto_vinculado: v.projeto_id || 'Nenhum',
                                km_estimado: v.km_rodado || 'A definir',
                              },
                            })
                          }
                          className="bg-slate-950/70 border border-slate-800/80 hover:border-blue-500/50 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex flex-col items-center justify-center shrink-0">
                              <Clock className="w-3.5 h-3.5 mb-0.5" />
                              <span className="text-xs font-mono font-bold leading-none">
                                {formatTime(v.data_agendamento)}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition">
                                {v.cliente_nome}
                              </h4>
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {v.motivo_visita}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <User className="w-3 h-3 text-cyan-400" />
                                  {v.tecnico_nome}
                                </span>
                                {v.ordem_servico_id && (
                                  <span className="bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono text-[10px]">
                                    OS Vinculada
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                              {v.status_visita}
                            </span>
                            <span className="text-slate-400 group-hover:text-blue-400 transition">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 4 (DETALHADO) — OS Urgentes / Atrasadas */}
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 flex flex-col shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        OS Urgentes / Atrasadas
                      </h2>
                      <p className="text-xs text-slate-400">
                        Chamados com SLA crítico ou prazo de entrega expirado
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {osUrgentes.length} críticas
                  </span>
                </div>

                <div className="mt-4 flex-1">
                  {osUrgentes.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">
                        Nenhuma OS urgente ou atrasada no momento!
                      </p>
                      <span className="text-xs text-slate-400 mt-1">
                        Todos os chamados estão dentro do prazo estipulado.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {osUrgentes.map((os) => (
                        <div
                          key={os.id}
                          onClick={() =>
                            setSelectedItem({
                              tipo: 'os',
                              titulo: `OS #${os.numero_os} - ${os.cliente_nome}`,
                              detalhes: {
                                numero_os: os.numero_os,
                                cliente: os.cliente_nome,
                                tipo_servico: os.tipo_servico,
                                status: os.status,
                                prioridade: os.prioridade,
                                relato: os.relato_problema,
                                data_abertura: formatDate(os.data_abertura),
                                previsao_entrega: os.data_previsao ? formatDate(os.data_previsao) : 'Não informada',
                                atrasada: os.isAtrasada ? 'SIM (Prazo expirado)' : 'NÃO (Dentro do prazo)',
                                tecnico_responsavel: os.tecnico_nome,
                              },
                            })
                          }
                          className="bg-slate-950/70 border border-slate-800/80 hover:border-rose-500/50 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] font-mono leading-none">OS</span>
                              <span className="text-sm font-mono font-bold leading-none">
                                #{os.numero_os}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition">
                                  {os.cliente_nome}
                                </h4>
                                {os.isAtrasada && (
                                  <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.2 rounded font-semibold border border-rose-500/30">
                                    Atrasada
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                {os.relato_problema}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                                <span className="text-slate-400 font-mono text-[10px]">
                                  Prev: {formatDate(os.data_previsao)}
                                </span>
                                <span>•</span>
                                <span className="text-slate-400">{os.tecnico_nome}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase font-mono ${
                                os.prioridade === 'Urgente'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {os.prioridade}
                            </span>
                            <span className="text-slate-400 group-hover:text-rose-400 transition">
                              <ArrowUpRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* CARD 3 (DETALHADO) — PROJETOS DE INFRAESTRUTURA ATIVOS         */}
            {/* ============================================================== */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Projetos de Infraestrutura Ativos (Redes, Wi-Fi, CFTV)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Obras e instalações com status &quot;Em Execução&quot;
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveMenu('projetos')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {projetosAtivos.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-center p-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  <Server className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">
                    Nenhum projeto de infraestrutura em execução no momento
                  </p>
                  <span className="text-xs text-slate-400 mt-1">
                    Novos projetos de redes e CFTV aparecerão aqui assim que forem iniciados.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projetosAtivos.map((p) => (
                    <div
                      key={p.id}
                      onClick={() =>
                        setSelectedItem({
                          tipo: 'projeto',
                          titulo: p.titulo_projeto,
                          detalhes: {
                            titulo: p.titulo_projeto,
                            tipo: p.tipo_projeto,
                            cliente: p.cliente_nome,
                            status: p.status,
                            responsavel: p.tecnico_nome,
                            inicio_previsto: formatDate(p.data_inicio_prevista),
                          },
                        })
                      }
                      className="bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {p.tipo_projeto === 'Rede Wi-Fi' && <Wifi className="w-3 h-3" />}
                            {p.tipo_projeto === 'CFTV' && <Video className="w-3 h-3" />}
                            {p.tipo_projeto === 'Rede Local' && <Server className="w-3 h-3" />}
                            {p.tipo_projeto}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {p.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition line-clamp-1">
                          {p.titulo_projeto}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{p.cliente_nome}</span>
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">Resp: {p.tecnico_nome}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </ModuleErrorBoundary>

        {/* Rodapé Interno */}
        <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>RC Tech • Gestão Operacional de TI & Infraestrutura &copy; 2026</span>
          <span className="font-mono text-[11px] text-cyan-400">v1.2.0 • PostgreSQL Neon</span>
        </footer>
      </main>

      {/* Modal de Detalhes Interativo */}
      {renderDetailsModal()}
    </div>
  )
}
