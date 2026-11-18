import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { sql } from '@/lib/db'
import {
  Layers,
  Search,
  Plus,
  DollarSign,
  Tag,
  FileText,
  Trash2,
  Edit,
  X,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Package,
  Wrench,
  Wifi,
  Video,
  ShieldCheck
} from 'lucide-react'

export interface ServicoPadrao {
  id: string
  categoria: string
  nome_servico: string
  unidade_medida: string
  valor_sugerido: number
  descricao?: string | null
  created_at?: string
}

const CATEGORIAS_PADRAO = [
  'Redes & Infraestrutura',
  'CFTV & Segurança Eletrônica',
  'Manutenção & Suporte de Bancada',
  'Servidores & Nuvem',
  'Consultoria & Engenharia de TI',
  'Outros Serviços'
]

const UNIDADES_MEDIDA = [
  'Hora',
  'Ponto de Rede',
  'Câmera / Ponto',
  'Unidade',
  'Visita Técnica',
  'Metro',
  'Mensalidade'
]

const ITENS_SEMENTE = [
  {
    categoria: 'Redes & Infraestrutura',
    nome_servico: 'Instalação e Conectorização de Ponto de Rede Cat6',
    unidade_medida: 'Ponto de Rede',
    valor_sugerido: 65.0,
    descricao: 'Passagem de cabo Cat6, crimpagem de conector RJ45 blindado ou keystone e teste de continuidade com certificador.',
  },
  {
    categoria: 'Redes & Infraestrutura',
    nome_servico: 'Organização e Fusão em Rack de Telecomunicações',
    unidade_medida: 'Unidade',
    valor_sugerido: 450.0,
    descricao: 'Identificação de cabos, montagem de patch panels, organizadores horizontais e manobra de patch cords.',
  },
  {
    categoria: 'CFTV & Segurança Eletrônica',
    nome_servico: 'Instalação e Fixação de Câmera IP / Bullet / Dome',
    unidade_medida: 'Câmera / Ponto',
    valor_sugerido: 120.0,
    descricao: 'Fixação física, vedação, conectorização em switch PoE e direcionamento de ângulo de visão.',
  },
  {
    categoria: 'CFTV & Segurança Eletrônica',
    nome_servico: 'Configuração de NVR / Servidor de Gravação e Acesso Remoto',
    unidade_medida: 'Unidade',
    valor_sugerido: 250.0,
    descricao: 'Parametrização de stream, agendamento de gravação contínua/detecção, DDNS e configuração de app móvel.',
  },
  {
    categoria: 'Manutenção & Suporte de Bancada',
    nome_servico: 'Limpeza Preventiva e Troca de Pasta Térmica (Prata)',
    unidade_medida: 'Unidade',
    valor_sugerido: 180.0,
    descricao: 'Desmontagem, desoxidação de contatos, substituição de interface térmica e teste de estresse térmico.',
  },
  {
    categoria: 'Manutenção & Suporte de Bancada',
    nome_servico: 'Upgrade de SSD NVMe e Clonagem de Sistema Operacional',
    unidade_medida: 'Unidade',
    valor_sugerido: 160.0,
    descricao: 'Clonagem integral setor a setor sem perda de licenças, particionamento e otimização de TRIM.',
  },
  {
    categoria: 'Servidores & Nuvem',
    nome_servico: 'Configuração de Rotinas de Backup Automatizado 3-2-1',
    unidade_medida: 'Unidade',
    valor_sugerido: 380.0,
    descricao: 'Implementação de cópia local em NAS e envio versionado criptografado para nuvem com alertas de falha.',
  },
  {
    categoria: 'Consultoria & Engenharia de TI',
    nome_servico: 'Hora Técnica de Suporte Sênior / Especialista',
    unidade_medida: 'Hora',
    valor_sugerido: 150.0,
    descricao: 'Atendimento avançado para diagnóstico de lentidão de rede, troubleshooting de switches e firewalls.',
  },
]

export const CatalogoServicosModule: React.FC = () => {
  const [servicos, setServicos] = useState<ServicoPadrao[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')

  // Banners
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Modal Novo Serviço
  const [showNovoModal, setShowNovoModal] = useState(false)
  const [savingNovo, setSavingNovo] = useState(false)
  const [novoForm, setNovoForm] = useState({
    categoria: 'Redes & Infraestrutura',
    nome_servico: '',
    unidade_medida: 'Ponto de Rede',
    valor_sugerido: 0,
    descricao: '',
  })

  // Modal Edição
  const [editingServico, setEditingServico] = useState<ServicoPadrao | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    categoria: '',
    nome_servico: '',
    unidade_medida: '',
    valor_sugerido: 0,
    descricao: '',
  })

  // Modal Exclusão
  const [deletingServico, setDeletingServico] = useState<ServicoPadrao | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carregar Catálogo
  const loadServicos = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await sql`
        SELECT id, categoria, nome_servico, unidade_medida, valor_sugerido, descricao, created_at
        FROM tabela_servicos_padrao
        ORDER BY categoria ASC, nome_servico ASC
      `
      setServicos(
        data.map((r: any) => ({
          ...r,
          valor_sugerido: Number(r.valor_sugerido || 0),
        }))
      )
    } catch (err: any) {
      console.error('Erro ao carregar catálogo:', err)
      setErrorBanner('Erro ao carregar serviços do banco de dados.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadServicos()
  }, [loadServicos])

  // Popular Catálogo Inicial
  const handlePopularCatalogo = async () => {
    try {
      setSeeding(true)
      for (const item of ITENS_SEMENTE) {
        await sql`
          INSERT INTO tabela_servicos_padrao (
            categoria,
            nome_servico,
            unidade_medida,
            valor_sugerido,
            descricao
          )
          VALUES (
            ${item.categoria},
            ${item.nome_servico},
            ${item.unidade_medida},
            ${item.valor_sugerido},
            ${item.descricao}
          )
        `
      }
      setSuccessBanner('Catálogo inicial padrão de serviços e preços de TI carregado com sucesso!')
      await loadServicos()
    } catch (err: any) {
      console.error('Erro ao popular catálogo:', err)
      setErrorBanner(err.message || 'Erro ao carregar catálogo padrão.')
    } finally {
      setSeeding(false)
    }
  }

  // Cadastrar Novo Serviço
  const handleCriarServico = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBanner(null)
    setSuccessBanner(null)

    if (!novoForm.nome_servico.trim()) {
      setErrorBanner('Informe o nome do serviço.')
      return
    }

    try {
      setSavingNovo(true)
      await sql`
        INSERT INTO tabela_servicos_padrao (
          categoria,
          nome_servico,
          unidade_medida,
          valor_sugerido,
          descricao
        )
        VALUES (
          ${novoForm.categoria},
          ${novoForm.nome_servico.trim()},
          ${novoForm.unidade_medida},
          ${novoForm.valor_sugerido || 0},
          ${novoForm.descricao.trim() || null}
        )
      `

      setSuccessBanner(`Serviço "${novoForm.nome_servico}" adicionado ao catálogo!`)
      setShowNovoModal(false)
      setNovoForm({
        categoria: 'Redes & Infraestrutura',
        nome_servico: '',
        unidade_medida: 'Ponto de Rede',
        valor_sugerido: 0,
        descricao: '',
      })
      await loadServicos()
    } catch (err: any) {
      console.error('Erro ao salvar serviço:', err)
      setErrorBanner(err.message || 'Erro ao cadastrar serviço.')
    } finally {
      setSavingNovo(false)
    }
  }

  // Abrir Modal de Edição
  const handleOpenEdit = (s: ServicoPadrao) => {
    setEditingServico(s)
    setEditForm({
      categoria: s.categoria,
      nome_servico: s.nome_servico,
      unidade_medida: s.unidade_medida,
      valor_sugerido: s.valor_sugerido,
      descricao: s.descricao || '',
    })
  }

  // Salvar Edição
  const handleUpdateServico = async () => {
    if (!editingServico) return

    try {
      setSavingEdit(true)
      await sql`
        UPDATE tabela_servicos_padrao
        SET
          categoria = ${editForm.categoria},
          nome_servico = ${editForm.nome_servico.trim()},
          unidade_medida = ${editForm.unidade_medida},
          valor_sugerido = ${editForm.valor_sugerido || 0},
          descricao = ${editForm.descricao.trim() || null}
        WHERE id = ${editingServico.id}
      `

      setSuccessBanner(`Serviço "${editForm.nome_servico}" atualizado com sucesso!`)
      setEditingServico(null)
      await loadServicos()
    } catch (err: any) {
      console.error('Erro ao atualizar serviço:', err)
      setErrorBanner(err.message || 'Erro ao atualizar serviço.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Excluir Serviço
  const handleConfirmarExclusao = async () => {
    if (!deletingServico) return

    try {
      setIsDeleting(true)
      await sql`DELETE FROM tabela_servicos_padrao WHERE id = ${deletingServico.id}`
      setSuccessBanner(`Item "${deletingServico.nome_servico}" removido do catálogo.`)
      setDeletingServico(null)
      await loadServicos()
    } catch (err: any) {
      console.error('Erro ao excluir serviço:', err)
      setErrorBanner(err.message || 'Erro ao excluir item do catálogo.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtragem
  const filteredServicos = useMemo(() => {
    return servicos.filter((s) => {
      const q = searchTerm.toLowerCase()
      const matchText =
        s.nome_servico.toLowerCase().includes(q) ||
        s.categoria.toLowerCase().includes(q) ||
        (s.descricao && s.descricao.toLowerCase().includes(q))

      if (!matchText) return false
      if (categoriaFilter !== 'todas' && s.categoria !== categoriaFilter) return false
      return true
    })
  }, [servicos, searchTerm, categoriaFilter])

  // Contadores
  const categoriasUnicas = Array.from(new Set(servicos.map((s) => s.categoria)))
  const valorMedio =
    servicos.length > 0
      ? servicos.reduce((acc, curr) => acc + curr.valor_sugerido, 0) / servicos.length
      : 0

  return (
    <div className="p-6 md:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider font-mono">
              Tabela de Preços & Serviços
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Catálogo / Serviços
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Padronize a precificação de mão de obra, pontos de rede, câmeras CFTV e suporte técnico.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadServicos()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Recarregar catálogo"
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
            <span>Novo Serviço / Item</span>
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Itens no Catálogo</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{servicos.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Serviços e tabelas padronizadas</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Categorias</p>
              <h3 className="text-3xl font-extrabold text-purple-300 mt-1">{categoriasUnicas.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Segmentos de atendimento</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Valor Médio Sugerido</p>
              <h3 className="text-3xl font-extrabold text-emerald-300 mt-1 font-mono">
                R$ {valorMedio.toFixed(2)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Média por item/hora de serviço</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Padrão Operacional</p>
            <p className="text-xs text-slate-300 mt-1">
              Valores base para orçamentos, OSs e propostas comerciais.
            </p>
          </div>
          {servicos.length === 0 && (
            <button
              onClick={handlePopularCatalogo}
              disabled={seeding}
              className="mt-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{seeding ? 'Carregando...' : 'Carregar Catálogo Sugerido'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome do serviço, categoria ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
            >
              <option value="todas">Categoria: Todas</option>
              {categoriasUnicas.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
          <span>
            Exibindo <strong className="text-cyan-400 font-mono">{filteredServicos.length}</strong> de {servicos.length} serviços cadastrados
          </span>
          {(searchTerm || categoriaFilter !== 'todas') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setCategoriaFilter('todas')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Serviços */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Carregando catálogo de serviços...</span>
          </div>
        ) : filteredServicos.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold text-white">Nenhum serviço no catálogo</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Cadastre serviços avulsos ou clique no botão abaixo para preencher automaticamente com itens e preços sugeridos de TI & CFTV.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handlePopularCatalogo}
                disabled={seeding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seeding ? 'Populando...' : 'Carregar Catálogo Sugerido'}</span>
              </button>
              <button
                onClick={() => setShowNovoModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Manualmente</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Serviço / Procedimento</th>
                  <th className="py-3.5 px-6">Categoria</th>
                  <th className="py-3.5 px-6">Unidade de Medida</th>
                  <th className="py-3.5 px-6 text-right">Valor Sugerido</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredServicos.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleOpenEdit(s)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 max-w-md">
                      <span className="font-semibold text-white block">{s.nome_servico}</span>
                      {s.descricao && (
                        <span className="text-xs text-slate-400 block truncate mt-0.5">
                          {s.descricao}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-cyan-300 border border-slate-700 inline-block">
                        {s.categoria}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-300 font-mono">
                      {s.unidade_medida}
                    </td>

                    <td className="py-4 px-6 text-right font-mono font-bold text-xs text-emerald-400">
                      R$ {Number(s.valor_sugerido || 0).toFixed(2)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(s)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition cursor-pointer"
                          title="Editar serviço"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingServico(s)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Excluir do catálogo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: NOVO SERVIÇO                                            */}
      {/* ============================================================== */}
      {showNovoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative">
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
                <h3 className="text-xl font-bold text-white">Novo Item de Catálogo</h3>
                <p className="text-xs text-slate-400">
                  Adicione um serviço padrão e precificação de referência
                </p>
              </div>
            </div>

            <form onSubmit={handleCriarServico} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Instalação de Câmera IP Dome com Caixa Hermética"
                  value={novoForm.nome_servico}
                  onChange={(e) => setNovoForm({ ...novoForm, nome_servico: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Categoria *
                  </label>
                  <select
                    value={novoForm.categoria}
                    onChange={(e) => setNovoForm({ ...novoForm, categoria: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Unidade de Medida *
                  </label>
                  <select
                    value={novoForm.unidade_medida}
                    onChange={(e) => setNovoForm({ ...novoForm, unidade_medida: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {UNIDADES_MEDIDA.map((un) => (
                      <option key={un} value={un}>
                        {un}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Valor Sugerido (R$) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={novoForm.valor_sugerido || ''}
                    onChange={(e) =>
                      setNovoForm({
                        ...novoForm,
                        valor_sugerido: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Descrição Técnica / Escopo Incluso
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o que está contemplado na execução deste serviço..."
                  value={novoForm.descricao}
                  onChange={(e) => setNovoForm({ ...novoForm, descricao: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovo}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingNovo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Adicionar ao Catálogo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR SERVIÇO                                          */}
      {/* ============================================================== */}
      {editingServico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative">
            <button
              onClick={() => setEditingServico(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-4">Editar Item do Catálogo</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  value={editForm.nome_servico}
                  onChange={(e) => setEditForm({ ...editForm, nome_servico: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Categoria
                  </label>
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Unidade de Medida
                  </label>
                  <select
                    value={editForm.unidade_medida}
                    onChange={(e) => setEditForm({ ...editForm, unidade_medida: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  >
                    {UNIDADES_MEDIDA.map((un) => (
                      <option key={un} value={un}>
                        {un}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Valor Sugerido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.valor_sugerido}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      valor_sugerido: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingServico(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdateServico}
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO                                      */}
      {/* ============================================================== */}
      {deletingServico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Excluir Serviço</h3>
            <p className="text-sm text-slate-300 mb-6">
              Tem certeza que deseja remover o item <strong className="text-white">{deletingServico.nome_servico}</strong> do catálogo de serviços?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingServico(null)}
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
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

