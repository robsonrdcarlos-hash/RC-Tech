import React, { useState, useEffect, useCallback, useId } from 'react'
import { sql } from '@/lib/db'
import { formatDocument, formatPhone, formatCEP } from '@/lib/masks'
import { GeradorLaudoIA, LaudoIAData } from './GeradorLaudoIA'
import {
  Building2,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  Server,
  Wrench,
  Loader2,
  FolderGit2,
  FileCheck2,
  Plus,
  X,
  HardDrive,
  Laptop,
  Printer,
  Zap,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react'

export interface Equipamento {
  id: string
  cliente_id: string
  tipo_equipamento: string
  marca: string | null
  modelo: string | null
  numero_serie: string | null
  patrimonio: string | null
  especificacoes: string | null
  observacoes_estado_geral: string | null
  created_at?: string
}

export interface OrdemServicoItem {
  id: string
  numero_os: number
  tipo_servico: string
  status: string
  prioridade: string
  relato_problema: string
  diagnostico_tecnico: string | null
  servicos_executados: string | null
  valor_total: number | null
  data_abertura: string
  data_previsao: string | null
  data_fechamento: string | null
  tecnico_nome: string | null
  equipamento_id: string | null
  equipamento_info?: string | null
}

export interface ProjetoItem {
  id: string
  titulo_projeto: string
  tipo_projeto: string
  status: string
  data_inicio_prevista: string | null
  data_conclusao: string | null
  observacoes_projeto: string | null
  tecnico_nome: string | null
}

export interface ContratoItem {
  id: string
  titulo_contrato: string
  sla_horas: number | null
  valor_mensal: number | null
  data_inicio: string | null
  data_fim: string | null
  status_contrato: string | null
  escopo_servicos: Record<string, unknown> | null
}

interface TecnicoOption {
  id: string
  nome: string
  nivel_acesso: string
}

interface ClientePerfilProps {
  clienteId: string
  onBack: () => void
}

export const ClientePerfil: React.FC<ClientePerfilProps> = ({ clienteId, onBack }) => {
  // Aba principal do Perfil
  const [activeTab, setActiveTab] = useState<'dados' | 'equipamentos' | 'os' | 'projetos'>('dados')

  // Aba interna dos Dados do Cliente (Aba 1: Dados Gerais, Aba 2: Endereço, Aba 3: TI)
  const [dadosTab, setDadosTab] = useState<'gerais' | 'endereco' | 'ti'>('gerais')

  // Estados de dados
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState<Record<string, unknown> | null>(null)
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [ordensServico, setOrdensServico] = useState<OrdemServicoItem[]>([])
  const [projetos, setProjetos] = useState<ProjetoItem[]>([])
  const [contratos, setContratos] = useState<ContratoItem[]>([])
  const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([])

  // Formulário de edição dos dados do cliente
  const [editFormData, setEditFormData] = useState({
    tipo_cliente: 'PJ' as 'PF' | 'PJ',
    razao_social: '',
    nome_fantasia: '',
    documento: '',
    contato_responsavel: '',
    telefone: '',
    whatsapp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    tecnico_responsavel_id: '',
    observacoes: '',
    infraestrutura_resumo: '',
  })

  // Mensagens e carregamentos do form de edição
  const [savingCliente, setSavingCliente] = useState(false)
  const [clienteSuccessMsg, setClienteSuccessMsg] = useState<string | null>(null)
  const [clienteErrorMsg, setClienteErrorMsg] = useState<string | null>(null)
  const [isSearchingCep, setIsSearchingCep] = useState(false)

  // Modais
  const [showAddEquipModal, setShowAddEquipModal] = useState(false)
  const [showAddOSModal, setShowAddOSModal] = useState(false)
  const [showAddProjetoModal, setShowAddProjetoModal] = useState(false)
  const [selectedOSDetails, setSelectedOSDetails] = useState<OrdemServicoItem | null>(null)
  const [activeIaModal, setActiveIaModal] = useState<{
    tipo: 'laudo_os' | 'escopo_projeto'
    targetId: string
    contexto: {
      clienteNome?: string
      equipamentoInfo?: string
      relatoProblemaOuDemanda?: string
      tipoServico?: string
      historico?: string
    }
  } | null>(null)

  // Form states dos modais
  const [equipForm, setEquipForm] = useState({
    tipo_equipamento: 'Notebook',
    marca: '',
    modelo: '',
    numero_serie: '',
    patrimonio: '',
    especificacoes: '',
    observacoes_estado_geral: '',
  })
  const [savingEquip, setSavingEquip] = useState(false)
  const [equipError, setEquipError] = useState<string | null>(null)

  const [osForm, setOsForm] = useState({
    equipamento_id: '',
    tipo_servico: 'Assistência de Bancada',
    relato_problema: '',
    prioridade: 'Média',
    tecnico_id: '',
    previsao_dias: 2,
  })
  const [savingOS, setSavingOS] = useState(false)
  const [osError, setOsError] = useState<string | null>(null)

  const [projForm, setProjForm] = useState({
    titulo_projeto: '',
    tipo_projeto: 'Rede Wi-Fi',
    status: 'Em Execução',
    responsavel_tecnico_id: '',
    observacoes_projeto: '',
  })
  const [savingProj, setSavingProj] = useState(false)
  const [projError, setProjError] = useState<string | null>(null)

  // Estado para laudo/fechamento da OS no modal de detalhes
  const [osEditData, setOsEditData] = useState({
    status: '',
    diagnostico_tecnico: '',
    servicos_executados: '',
    valor_total: 0,
  })
  const [savingOSDetails, setSavingOSDetails] = useState(false)
  const [osDetailsSuccess, setOsDetailsSuccess] = useState<string | null>(null)

  // IDs para acessibilidade
  const tipoClienteEditId = useId()
  const razaoEditId = useId()
  const fantasiaEditId = useId()
  const docEditId = useId()
  const contatoEditId = useId()
  const telEditId = useId()
  const zapEditId = useId()
  const emailEditId = useId()
  const cepEditId = useId()
  const endEditId = useId()
  const numEditId = useId()
  const complEditId = useId()
  const bairroEditId = useId()
  const cidEditId = useId()
  const ufEditId = useId()
  const tecEditId = useId()
  const infraEditId = useId()
  const obsEditId = useId()

  // 1. Carrega dados completos do cliente e registros relacionados
  const loadClienteData = useCallback(async () => {
    try {
      setLoading(true)

      // Clientes e técnico responsável
      const clienteQuery = await sql`
        SELECT 
          c.*,
          t.nome as tecnico_nome
        FROM clientes c
        LEFT JOIN tecnicos t ON t.id = c.tecnico_responsavel_id
        WHERE c.id = ${clienteId}
        LIMIT 1
      `

      if (clienteQuery && clienteQuery.length > 0) {
        const c = clienteQuery[0]
        setCliente(c)
        setEditFormData({
          tipo_cliente: (c.tipo_cliente as 'PF' | 'PJ') || 'PJ',
          razao_social: (c.razao_social as string) || (c.nome_fantasia_ou_razao as string) || '',
          nome_fantasia: (c.nome_fantasia as string) || '',
          documento: (c.documento as string) || '',
          contato_responsavel: (c.contato_responsavel as string) || '',
          telefone: (c.telefone as string) || '',
          whatsapp: (c.whatsapp as string) || '',
          email: (c.email as string) || '',
          cep: (c.cep as string) || '',
          endereco: (c.endereco as string) || '',
          numero: (c.numero as string) || '',
          complemento: (c.complemento as string) || '',
          bairro: (c.bairro as string) || '',
          cidade: (c.cidade as string) || '',
          estado: (c.estado as string) || 'SP',
          tecnico_responsavel_id: (c.tecnico_responsavel_id as string) || '',
          observacoes: (c.observacoes as string) || '',
          infraestrutura_resumo: (c.infraestrutura_resumo as string) || '',
        })
      }

      // Técnicos para dropdowns
      const tecnicosQuery = await sql`
        SELECT id, nome, nivel_acesso FROM tecnicos ORDER BY nome ASC
      `
      setTecnicos(
        tecnicosQuery.map((t) => ({
          id: t.id as string,
          nome: t.nome as string,
          nivel_acesso: t.nivel_acesso as string,
        }))
      )

      // Equipamentos do cliente
      const equipQuery = await sql`
        SELECT * FROM equipamentos_cliente 
        WHERE cliente_id = ${clienteId} 
        ORDER BY created_at DESC NULLS LAST
      `
      setEquipamentos(
        equipQuery.map((e) => ({
          id: e.id as string,
          cliente_id: e.cliente_id as string,
          tipo_equipamento: e.tipo_equipamento as string,
          marca: e.marca as string | null,
          modelo: e.modelo as string | null,
          numero_serie: e.numero_serie as string | null,
          patrimonio: e.patrimonio as string | null,
          especificacoes: e.especificacoes as string | null,
          observacoes_estado_geral: e.observacoes_estado_geral as string | null,
          created_at: e.created_at as string | undefined,
        }))
      )

      // Ordens de Serviço (cronológica decrescente)
      const osQuery = await sql`
        SELECT 
          o.id,
          o.numero_os,
          o.tipo_servico,
          o.status,
          o.prioridade,
          o.relato_problema,
          o.diagnostico_tecnico,
          o.servicos_executados,
          o.valor_total,
          o.data_abertura,
          o.data_previsao,
          o.data_fechamento,
          o.equipamento_id,
          t.nome as tecnico_nome,
          CONCAT(eq.tipo_equipamento, ' ', eq.marca, ' ', eq.modelo) as equipamento_info
        FROM ordens_servico o
        LEFT JOIN tecnicos t ON t.id = o.tecnico_id
        LEFT JOIN equipamentos_cliente eq ON eq.id = o.equipamento_id
        WHERE o.cliente_id = ${clienteId}
        ORDER BY o.data_abertura DESC, o.numero_os DESC
      `
      setOrdensServico(
        osQuery.map((o) => ({
          id: o.id as string,
          numero_os: Number(o.numero_os),
          tipo_servico: o.tipo_servico as string,
          status: o.status as string,
          prioridade: (o.prioridade as string) || 'Média',
          relato_problema: o.relato_problema as string,
          diagnostico_tecnico: o.diagnostico_tecnico as string | null,
          servicos_executados: o.servicos_executados as string | null,
          valor_total: o.valor_total ? Number(o.valor_total) : null,
          data_abertura: o.data_abertura as string,
          data_previsao: o.data_previsao as string | null,
          data_fechamento: o.data_fechamento as string | null,
          tecnico_nome: o.tecnico_nome as string | null,
          equipamento_id: o.equipamento_id as string | null,
          equipamento_info: o.equipamento_info as string | null,
        }))
      )

      // Projetos de Infraestrutura
      const projQuery = await sql`
        SELECT 
          p.id,
          p.titulo_projeto,
          p.tipo_projeto,
          p.status,
          p.data_inicio_prevista,
          p.data_conclusao,
          p.observacoes_projeto,
          t.nome as tecnico_nome
        FROM projetos_infraestrutura p
        LEFT JOIN tecnicos t ON t.id = p.responsavel_tecnico_id
        WHERE p.cliente_id = ${clienteId}
        ORDER BY p.data_inicio_prevista DESC NULLS LAST
      `
      setProjetos(
        projQuery.map((p) => ({
          id: p.id as string,
          titulo_projeto: p.titulo_projeto as string,
          tipo_projeto: p.tipo_projeto as string,
          status: p.status as string,
          data_inicio_prevista: p.data_inicio_prevista as string | null,
          data_conclusao: p.data_conclusao as string | null,
          observacoes_projeto: p.observacoes_projeto as string | null,
          tecnico_nome: p.tecnico_nome as string | null,
        }))
      )

      // Contratos recorrentes
      const contQuery = await sql`
        SELECT 
          id,
          titulo_contrato,
          sla_horas,
          valor_mensal,
          data_inicio,
          data_fim,
          status_contrato,
          escopo_servicos
        FROM contratos_manutencao_recorrente
        WHERE cliente_id = ${clienteId}
        ORDER BY data_inicio DESC NULLS LAST
      `
      setContratos(
        contQuery.map((c) => ({
          id: c.id as string,
          titulo_contrato: c.titulo_contrato as string,
          sla_horas: c.sla_horas ? Number(c.sla_horas) : null,
          valor_mensal: c.valor_mensal ? Number(c.valor_mensal) : null,
          data_inicio: c.data_inicio as string | null,
          data_fim: c.data_fim as string | null,
          status_contrato: c.status_contrato as string | null,
          escopo_servicos: c.escopo_servicos as Record<string, unknown> | null,
        }))
      )
    } catch (err) {
      console.error('Erro ao carregar dados do perfil do cliente:', err)
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    loadClienteData()
  }, [loadClienteData])

  // Busca automática de CEP
  const handleCepBlur = async () => {
    const clean = editFormData.cep.replace(/\D/g, '')
    if (clean.length === 8) {
      try {
        setIsSearchingCep(true)
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
        if (res.ok) {
          const data = await res.json()
          if (!data.erro) {
            setEditFormData((p) => ({
              ...p,
              endereco: data.logradouro || p.endereco,
              bairro: data.bairro || p.bairro,
              cidade: data.localidade || p.cidade,
              estado: data.uf || p.estado,
            }))
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar ViaCEP:', err)
      } finally {
        setIsSearchingCep(false)
      }
    }
  }

  // 1. Salvar alterações nos dados do cliente (Seção 1)
  const handleSaveClienteEdits = async (e: React.FormEvent) => {
    e.preventDefault()
    setClienteSuccessMsg(null)
    setClienteErrorMsg(null)

    const nomePrincipal = editFormData.razao_social.trim()
    if (!nomePrincipal) {
      setClienteErrorMsg('O campo Nome / Razão Social é obrigatório.')
      return
    }

    try {
      setSavingCliente(true)
      const nomeFantasiaOuRazao = editFormData.nome_fantasia.trim() || nomePrincipal
      const tecId = editFormData.tecnico_responsavel_id || null

      await sql`
        UPDATE clientes
        SET
          tipo_cliente = ${editFormData.tipo_cliente},
          nome_fantasia_ou_razao = ${nomeFantasiaOuRazao},
          razao_social = ${nomePrincipal},
          nome_fantasia = ${editFormData.nome_fantasia.trim() || null},
          documento = ${editFormData.documento},
          contato_responsavel = ${editFormData.contato_responsavel.trim() || null},
          telefone = ${editFormData.telefone.trim() || null},
          whatsapp = ${editFormData.whatsapp.trim() || null},
          email = ${editFormData.email.trim() || null},
          cep = ${editFormData.cep.trim() || null},
          endereco = ${editFormData.endereco.trim() || null},
          numero = ${editFormData.numero.trim() || null},
          complemento = ${editFormData.complemento.trim() || null},
          bairro = ${editFormData.bairro.trim() || null},
          cidade = ${editFormData.cidade.trim() || null},
          estado = ${editFormData.estado.trim() || null},
          tecnico_responsavel_id = ${tecId},
          observacoes = ${editFormData.observacoes.trim() || null},
          infraestrutura_resumo = ${editFormData.infraestrutura_resumo.trim() || null}
        WHERE id = ${clienteId}
      `

      setClienteSuccessMsg('Alterações salvas com sucesso!')
      setTimeout(() => setClienteSuccessMsg(null), 4000)
      loadClienteData()
    } catch (err: unknown) {
      console.error('Erro ao salvar edições do cliente:', err)
      const errObj = err as { message?: string }
      setClienteErrorMsg(errObj?.message || 'Falha ao salvar alterações no banco de dados.')
    } finally {
      setSavingCliente(false)
    }
  }

  // 2. Salvar novo equipamento (Seção 2)
  const handleSaveEquipamento = async (e: React.FormEvent) => {
    e.preventDefault()
    setEquipError(null)

    if (!equipForm.tipo_equipamento) {
      setEquipError('O tipo de equipamento é obrigatório.')
      return
    }

    try {
      setSavingEquip(true)
      await sql`
        INSERT INTO equipamentos_cliente (
          cliente_id,
          tipo_equipamento,
          marca,
          modelo,
          numero_serie,
          patrimonio,
          especificacoes,
          observacoes_estado_geral
        )
        VALUES (
          ${clienteId},
          ${equipForm.tipo_equipamento},
          ${equipForm.marca.trim() || null},
          ${equipForm.modelo.trim() || null},
          ${equipForm.numero_serie.trim() || null},
          ${equipForm.patrimonio.trim() || null},
          ${equipForm.especificacoes.trim() || null},
          ${equipForm.observacoes_estado_geral.trim() || null}
        )
      `

      // Limpar form e fechar modal
      setEquipForm({
        tipo_equipamento: 'Notebook',
        marca: '',
        modelo: '',
        numero_serie: '',
        patrimonio: '',
        especificacoes: '',
        observacoes_estado_geral: '',
      })
      setShowAddEquipModal(false)
      // Atualizar lista automaticamente
      loadClienteData()
    } catch (err: unknown) {
      console.error('Erro ao adicionar equipamento:', err)
      const errObj = err as { message?: string }
      setEquipError(errObj?.message || 'Erro ao registrar equipamento.')
    } finally {
      setSavingEquip(false)
    }
  }

  // 3. Abrir nova OS vinculada (Seção 3)
  const handleSaveOS = async (e: React.FormEvent) => {
    e.preventDefault()
    setOsError(null)

    if (!osForm.relato_problema.trim()) {
      setOsError('O relato do problema é obrigatório.')
      return
    }

    try {
      setSavingOS(true)
      const tecId = osForm.tecnico_id || (editFormData.tecnico_responsavel_id as string) || null
      const equipId = osForm.equipamento_id || null
      const previsaoData = new Date(Date.now() + osForm.previsao_dias * 24 * 60 * 60 * 1000).toISOString()

      await sql`
        INSERT INTO ordens_servico (
          cliente_id,
          equipamento_id,
          tecnico_id,
          tipo_servico,
          status,
          prioridade,
          relato_problema,
          data_abertura,
          data_previsao
        )
        VALUES (
          ${clienteId},
          ${equipId},
          ${tecId},
          ${osForm.tipo_servico},
          'Aberta',
          ${osForm.prioridade},
          ${osForm.relato_problema.trim()},
          NOW(),
          ${previsaoData}
        )
      `

      setOsForm({
        equipamento_id: '',
        tipo_servico: 'Assistência de Bancada',
        relato_problema: '',
        prioridade: 'Média',
        tecnico_id: '',
        previsao_dias: 2,
      })
      setShowAddOSModal(false)
      loadClienteData()
    } catch (err: unknown) {
      console.error('Erro ao abrir OS:', err)
      const errObj = err as { message?: string }
      setOsError(errObj?.message || 'Falha ao registrar nova Ordem de Serviço.')
    } finally {
      setSavingOS(false)
    }
  }

  // 4. Salvar novo Projeto de Infraestrutura (Seção 4)
  const handleSaveProjeto = async (e: React.FormEvent) => {
    e.preventDefault()
    setProjError(null)

    if (!projForm.titulo_projeto.trim()) {
      setProjError('O título do projeto é obrigatório.')
      return
    }

    try {
      setSavingProj(true)
      const tecId = projForm.responsavel_tecnico_id || (editFormData.tecnico_responsavel_id as string) || null

      await sql`
        INSERT INTO projetos_infraestrutura (
          cliente_id,
          titulo_projeto,
          tipo_projeto,
          status,
          responsavel_tecnico_id,
          data_inicio_prevista,
          observacoes_projeto
        )
        VALUES (
          ${clienteId},
          ${projForm.titulo_projeto.trim()},
          ${projForm.tipo_projeto},
          ${projForm.status},
          ${tecId},
          CURRENT_DATE,
          ${projForm.observacoes_projeto.trim() || null}
        )
      `

      setProjForm({
        titulo_projeto: '',
        tipo_projeto: 'Rede Wi-Fi',
        status: 'Em Execução',
        responsavel_tecnico_id: '',
        observacoes_projeto: '',
      })
      setShowAddProjetoModal(false)
      loadClienteData()
    } catch (err: unknown) {
      console.error('Erro ao criar projeto:', err)
      const errObj = err as { message?: string }
      setProjError(errObj?.message || 'Falha ao registrar projeto.')
    } finally {
      setSavingProj(false)
    }
  }

  // 5. Atualizar laudo e fechamento da OS no modal de detalhes
  const handleUpdateOSDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOSDetails) return

    try {
      setSavingOSDetails(true)
      const dataFechamento = osEditData.status === 'Concluída' ? new Date().toISOString() : null

      await sql`
        UPDATE ordens_servico
        SET
          status = ${osEditData.status},
          diagnostico_tecnico = ${osEditData.diagnostico_tecnico.trim() || null},
          servicos_executados = ${osEditData.servicos_executados.trim() || null},
          valor_total = ${osEditData.valor_total || null},
          data_fechamento = CASE WHEN ${osEditData.status} = 'Concluída' THEN NOW() ELSE data_fechamento END
        WHERE id = ${selectedOSDetails.id}
      `

      setOsDetailsSuccess('Ordem de Serviço atualizada com sucesso!')
      setTimeout(() => setOsDetailsSuccess(null), 3000)
      loadClienteData()
      setSelectedOSDetails((prev) =>
        prev
          ? {
              ...prev,
              status: osEditData.status,
              diagnostico_tecnico: osEditData.diagnostico_tecnico,
              servicos_executados: osEditData.servicos_executados,
              valor_total: osEditData.valor_total,
              data_fechamento: dataFechamento || prev.data_fechamento,
            }
          : null
      )
    } catch (err) {
      console.error('Erro ao atualizar OS:', err)
    } finally {
      setSavingOSDetails(false)
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

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return 'R$ 0,00'
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Ícone representativo por tipo de equipamento
  const getEquipIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'notebook':
        return <Laptop className="w-5 h-5" />
      case 'desktop':
        return <HardDrive className="w-5 h-5" />
      case 'servidor':
        return <Server className="w-5 h-5" />
      case 'impressora':
        return <Printer className="w-5 h-5" />
      case 'no-break':
        return <Zap className="w-5 h-5" />
      default:
        return <Wrench className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm">Carregando perfil e histórico completo do cliente...</span>
      </div>
    )
  }

  const nomeExibicao =
    editFormData.nome_fantasia || editFormData.razao_social || 'Cliente sem nome'

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* HEADER DO PERFIL                                              */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Voltar para a lista de clientes"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Perfil Integrado de TI
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                {editFormData.tipo_cliente}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {nomeExibicao}
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Doc: {editFormData.documento} • Cadastrado em {formatDate(cliente?.created_at as string)}
            </p>
          </div>
        </div>

        {/* Ações de Topo Rápidas */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddOSModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Nova OS</span>
          </button>
          <button
            onClick={() => setShowAddEquipModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-cyan-500/40 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Equipamento</span>
          </button>
          <button
            onClick={() => setShowAddProjetoModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500/40 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4 ABAS PRINCIPAIS DO PERFIL (PROMPT 5)                          */}
      {/* ============================================================== */}
      <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dados')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'dados'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Seção 1 — Dados do Cliente</span>
        </button>

        <button
          onClick={() => setActiveTab('equipamentos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'equipamentos'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Seção 2 — Equipamentos ({equipamentos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('os')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'os'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Seção 3 — Ordens de Serviço ({ordensServico.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('projetos')}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'projetos'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Seção 4 — Projetos & Contratos ({projetos.length + contratos.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 1: DADOS DO CLIENTE (EDITÁVEIS EM 3 ABAS)                */}
      {/* ============================================================== */}
      {activeTab === 'dados' && (
        <div className="space-y-6">
          {/* Sub-abas dos Dados */}
          <div className="flex gap-2">
            <button
              onClick={() => setDadosTab('gerais')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                dadosTab === 'gerais'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              1. Dados Gerais
            </button>
            <button
              onClick={() => setDadosTab('endereco')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                dadosTab === 'endereco'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              2. Endereço & Visitas
            </button>
            <button
              onClick={() => setDadosTab('ti')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                dadosTab === 'ti'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              3. Informações de TI
            </button>
          </div>

          {/* Feedback */}
          {clienteSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{clienteSuccessMsg}</span>
            </div>
          )}

          {clienteErrorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{clienteErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveClienteEdits}>
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              {/* SUB-ABA 1: DADOS GERAIS */}
              {dadosTab === 'gerais' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <span>Identificação e Contato</span>
                    </h3>
                    <span className="text-xs text-slate-400">Edição direta no banco</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor={tipoClienteEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Tipo de Cliente
                      </label>
                      <select
                        id={tipoClienteEditId}
                        value={editFormData.tipo_cliente}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            tipo_cliente: e.target.value as 'PF' | 'PJ',
                          })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      >
                        <option value="PJ">Pessoa Jurídica (PJ)</option>
                        <option value="PF">Pessoa Física (PF)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor={docEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {editFormData.tipo_cliente === 'PJ' ? 'CNPJ' : 'CPF'} *
                      </label>
                      <input
                        id={docEditId}
                        type="text"
                        required
                        value={editFormData.documento}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            documento: formatDocument(e.target.value, editFormData.tipo_cliente),
                          })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={razaoEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {editFormData.tipo_cliente === 'PJ' ? 'Razão Social' : 'Nome Completo'} *
                      </label>
                      <input
                        id={razaoEditId}
                        type="text"
                        required
                        value={editFormData.razao_social}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, razao_social: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={fantasiaEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Nome Fantasia / Apelido
                      </label>
                      <input
                        id={fantasiaEditId}
                        type="text"
                        value={editFormData.nome_fantasia}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, nome_fantasia: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={contatoEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Contato Responsável (TI / Financeiro)
                      </label>
                      <input
                        id={contatoEditId}
                        type="text"
                        value={editFormData.contato_responsavel}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, contato_responsavel: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={emailEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        E-mail Principal
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          id={emailEditId}
                          type="email"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, email: e.target.value })
                          }
                          className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={telEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Telefone Principal
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                          id={telEditId}
                          type="text"
                          value={editFormData.telefone}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              telefone: formatPhone(e.target.value),
                            })
                          }
                          className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor={zapEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        WhatsApp Operacional
                      </label>
                      <div className="relative">
                        <MessageCircle className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                        <input
                          id={zapEditId}
                          type="text"
                          value={editFormData.whatsapp}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              whatsapp: formatPhone(e.target.value),
                            })
                          }
                          className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 2: ENDEREÇO */}
              {dadosTab === 'endereco' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span>Endereço de Atendimento (Visitas / Campo)</span>
                    </h3>
                    <span className="text-xs text-slate-400">ViaCEP ativo</span>
                  </div>

                  <div className="max-w-xs">
                    <label htmlFor={cepEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      CEP (Busca Automática)
                    </label>
                    <div className="relative">
                      <input
                        id={cepEditId}
                        type="text"
                        value={editFormData.cep}
                        onBlur={handleCepBlur}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, cep: formatCEP(e.target.value) })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
                      />
                      {isSearchingCep && (
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400 absolute right-3 top-3" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="md:col-span-3">
                      <label htmlFor={endEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Logradouro
                      </label>
                      <input
                        id={endEditId}
                        type="text"
                        value={editFormData.endereco}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, endereco: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={numEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Número
                      </label>
                      <input
                        id={numEditId}
                        type="text"
                        value={editFormData.numero}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, numero: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor={complEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Complemento
                      </label>
                      <input
                        id={complEditId}
                        type="text"
                        value={editFormData.complemento}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, complemento: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor={bairroEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Bairro
                      </label>
                      <input
                        id={bairroEditId}
                        type="text"
                        value={editFormData.bairro}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, bairro: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label htmlFor={cidEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Cidade
                      </label>
                      <input
                        id={cidEditId}
                        type="text"
                        value={editFormData.cidade}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, cidade: e.target.value })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor={ufEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                        UF
                      </label>
                      <input
                        id={ufEditId}
                        type="text"
                        maxLength={2}
                        value={editFormData.estado}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            estado: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 3: INFORMAÇÕES DE TI */}
              {dadosTab === 'ti' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-400" />
                      <span>Contexto Técnico & Infraestrutura</span>
                    </h3>
                  </div>

                  <div className="max-w-md">
                    <label htmlFor={tecEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Técnico Responsável pela Conta
                    </label>
                    <select
                      id={tecEditId}
                      value={editFormData.tecnico_responsavel_id}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          tecnico_responsavel_id: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="">Fila Geral / Sem técnico específico</option>
                      {tecnicos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.nivel_acesso})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={infraEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Infraestrutura Atual Resumida
                    </label>
                    <textarea
                      id={infraEditId}
                      rows={3}
                      value={editFormData.infraestrutura_resumo}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          infraestrutura_resumo: e.target.value,
                        })
                      }
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl p-4 text-sm text-white font-mono outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={obsEditId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Observações de Acesso / Zeladoria
                    </label>
                    <textarea
                      id={obsEditId}
                      rows={3}
                      value={editFormData.observacoes}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, observacoes: e.target.value })
                      }
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl p-4 text-sm text-white outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Botão Salvar Alterações */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={savingCliente}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-950/50"
                >
                  {savingCliente ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando alterações...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar alterações</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* SEÇÃO 2: EQUIPAMENTOS DO CLIENTE                               */}
      {/* ============================================================== */}
      {activeTab === 'equipamentos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Parque Tecnológico e Equipamentos Cadastrados</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {equipamentos.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Notebooks, desktops, servidores e ativos de rede sob assistência ou manutenção.
              </p>
            </div>

            <button
              onClick={() => setShowAddEquipModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Equipamento</span>
            </button>
          </div>

          {equipamentos.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <HardDrive className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Nenhum equipamento cadastrado</h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6">
                Cadastre os dispositivos deste cliente para facilitar a abertura de Ordens de Serviço e controle de garantia.
              </p>
              <button
                onClick={() => setShowAddEquipModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Primeiro Equipamento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipamentos.map((eq) => (
                <div
                  key={eq.id}
                  className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 hover:border-cyan-500/40 transition shadow-lg flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        {getEquipIcon(eq.tipo_equipamento)}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {eq.tipo_equipamento}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                      {eq.marca ? `${eq.marca} ${eq.modelo || ''}` : eq.modelo || 'Equipamento'}
                    </h4>

                    <div className="space-y-1 mt-2 text-xs">
                      {eq.numero_serie && (
                        <p className="text-slate-400">
                          <span className="text-slate-400">S/N:</span>{' '}
                          <span className="font-mono text-cyan-400/90">{eq.numero_serie}</span>
                        </p>
                      )}
                      {eq.patrimonio && (
                        <p className="text-slate-400">
                          <span className="text-slate-400">Patrimônio:</span>{' '}
                          <span className="font-mono text-slate-300">{eq.patrimonio}</span>
                        </p>
                      )}
                    </div>

                    {eq.especificacoes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-300">
                        {eq.especificacoes}
                      </div>
                    )}
                  </div>

                  {eq.observacoes_estado_geral && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="text-slate-400 block font-semibold mb-0.5">Estado:</span>
                      <p className="line-clamp-2">{eq.observacoes_estado_geral}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SEÇÃO 3: ORDENS DE SERVIÇO (OS) E CHAMADOS                    */}
      {/* ============================================================== */}
      {activeTab === 'os' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Histórico de Chamados e Ordens de Serviço</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {ordensServico.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhamento cronológico de assistência de bancada, suporte externo e laudos.
              </p>
            </div>

            <button
              onClick={() => setShowAddOSModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Ordem de Serviço</span>
            </button>
          </div>

          {ordensServico.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Wrench className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Nenhuma Ordem de Serviço registrada para este cliente ainda
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6">
                Abra chamados para reparo de equipamentos em bancada ou atendimentos externos no local.
              </p>
              <button
                onClick={() => setShowAddOSModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Primeira OS</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {ordensServico.map((os) => (
                <div
                  key={os.id}
                  onClick={() => {
                    setSelectedOSDetails(os)
                    setOsEditData({
                      status: os.status,
                      diagnostico_tecnico: os.diagnostico_tecnico || '',
                      servicos_executados: os.servicos_executados || '',
                      valor_total: os.valor_total || 0,
                    })
                  }}
                  className="bg-slate-900/60 border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-5 transition hover:shadow-lg cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-mono leading-none">OS</span>
                      <span className="text-base font-mono font-bold leading-none mt-0.5">
                        #{os.numero_os}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                          {os.tipo_servico}
                        </span>
                        {os.equipamento_info && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                            {os.equipamento_info}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                        {os.relato_problema}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Abertura: {formatDate(os.data_abertura)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          {os.tecnico_nome || 'Sem técnico'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatCurrency(os.valor_total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase font-mono border ${
                          os.status === 'Concluída'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : os.status === 'Em Execução'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}
                      >
                        {os.status}
                      </span>

                      <span
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full uppercase font-mono border ${
                          os.prioridade === 'Urgente'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {os.prioridade}
                      </span>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SEÇÃO 4: PROJETOS DE INFRAESTRUTURA E CONTRATOS                */}
      {/* ============================================================== */}
      {activeTab === 'projetos' && (
        <div className="space-y-8">
          {/* Header e Botão Novo Projeto */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Projetos de Infraestrutura (Redes, Wi-Fi, CFTV)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                  {projetos.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Obras, implantações e expansões de infraestrutura física e lógica.
              </p>
            </div>

            <button
              onClick={() => setShowAddProjetoModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Projeto de Infraestrutura</span>
            </button>
          </div>

          {/* Lista de Projetos */}
          {projetos.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <FolderGit2 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                Nenhum projeto de infraestrutura cadastrado para este cliente ainda
              </p>
              <span className="text-xs text-slate-400 mt-1">
                Adicione projetos como cabeamento estruturado, Wi-Fi corporativo ou implantação de CFTV.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projetos.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 hover:border-indigo-500/40 transition shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                        {p.tipo_projeto}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1 mt-1">
                      {p.titulo_projeto}
                    </h4>

                    {p.observacoes_projeto && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {p.observacoes_projeto}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between items-center">
                    <span>Início: {formatDate(p.data_inicio_prevista)}</span>
                    <span className="text-indigo-400 font-medium">{p.tecnico_nome || 'Equipe'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-seção de Contratos de Manutenção Recorrente */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Contratos de Suporte e Manutenção Recorrente</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Mensalidades de TI, horas de SLA contratadas e rotinas preventivas.
                </p>
              </div>
            </div>

            {contratos.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
                Nenhum contrato recorrente registrado para este cliente ainda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contratos.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                          {c.status_contrato || 'Ativo'}
                        </span>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          {formatCurrency(c.valor_mensal)}/mês
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{c.titulo_contrato}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>SLA de Atendimento: {c.sla_horas || 4} horas</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                      <span>Vigência: {formatDate(c.data_inicio)} até {formatDate(c.data_fim)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADICIONAR EQUIPAMENTO                                 */}
      {/* ============================================================== */}
      {showAddEquipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddEquipModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-cyan-400">
                  Parque Tecnológico
                </span>
                <h3 className="text-lg font-bold text-white">Adicionar Equipamento</h3>
              </div>
            </div>

            {equipError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {equipError}
              </div>
            )}

            <form onSubmit={handleSaveEquipamento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Equipamento *
                </label>
                <select
                  value={equipForm.tipo_equipamento}
                  onChange={(e) => setEquipForm({ ...equipForm, tipo_equipamento: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="Notebook">Notebook</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Servidor">Servidor</option>
                  <option value="Impressora">Impressora</option>
                  <option value="No-break">No-break</option>
                  <option value="Switch/Roteador">Switch / Roteador</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell, HP, Lenovo"
                    value={equipForm.marca}
                    onChange={(e) => setEquipForm({ ...equipForm, marca: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Vostro 3520"
                    value={equipForm.modelo}
                    onChange={(e) => setEquipForm({ ...equipForm, modelo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de Série
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SN-88291"
                    value={equipForm.numero_serie}
                    onChange={(e) => setEquipForm({ ...equipForm, numero_serie: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Patrimônio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PAT-010"
                    value={equipForm.patrimonio}
                    onChange={(e) => setEquipForm({ ...equipForm, patrimonio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Especificações Técnicas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Core i5, 8GB RAM, SSD 240GB"
                  value={equipForm.especificacoes}
                  onChange={(e) => setEquipForm({ ...equipForm, especificacoes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações do Estado Geral
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tampa arranhada, fonte original ok, bateria durando 2h"
                  value={equipForm.observacoes_estado_geral}
                  onChange={(e) =>
                    setEquipForm({ ...equipForm, observacoes_estado_geral: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEquip}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5"
                >
                  {savingEquip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Equipamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ABRIR NOVA ORDEM DE SERVIÇO                           */}
      {/* ============================================================== */}
      {showAddOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-cyan-400">
                  Novo Chamado / OS
                </span>
                <h3 className="text-lg font-bold text-white">Abrir Ordem de Serviço</h3>
              </div>
            </div>

            {osError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {osError}
              </div>
            )}

            <form onSubmit={handleSaveOS} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cliente Vinculado
                </label>
                <input
                  type="text"
                  disabled
                  value={nomeExibicao}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Equipamento Vinculado
                </label>
                <select
                  value={osForm.equipamento_id}
                  onChange={(e) => setOsForm({ ...osForm, equipamento_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="">Nenhum equipamento específico (Serviço geral/Infra)</option>
                  {equipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.tipo_equipamento} - {eq.marca} {eq.modelo} ({eq.numero_serie || 'Sem S/N'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Serviço
                  </label>
                  <select
                    value={osForm.tipo_servico}
                    onChange={(e) => setOsForm({ ...osForm, tipo_servico: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Assistência de Bancada">Assistência de Bancada</option>
                    <option value="Suporte Técnico Externo (Visita)">Suporte Externo (Visita)</option>
                    <option value="Instalação Avulsa">Instalação Avulsa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={osForm.prioridade}
                    onChange={(e) => setOsForm({ ...osForm, prioridade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Técnico Responsável
                </label>
                <select
                  value={osForm.tecnico_id}
                  onChange={(e) => setOsForm({ ...osForm, tecnico_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="">Utilizar técnico padrão da conta / Não atribuir</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel_acesso})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Relato do Problema / Defeito Reclamado *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Notebook não liga após oscilação de energia; tela pisca e trava na logo."
                  value={osForm.relato_problema}
                  onChange={(e) => setOsForm({ ...osForm, relato_problema: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddOSModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOS}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5"
                >
                  {savingOS ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Abrir OS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: NOVO PROJETO DE INFRAESTRUTURA                        */}
      {/* ============================================================== */}
      {showAddProjetoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddProjetoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-400">
                  Infraestrutura & Redes
                </span>
                <h3 className="text-lg font-bold text-white">Novo Projeto de Infraestrutura</h3>
              </div>
            </div>

            {projError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {projError}
              </div>
            )}

            <form onSubmit={handleSaveProjeto} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Implantação de Rede Wi-Fi Corporativa (8 APs)"
                  value={projForm.titulo_projeto}
                  onChange={(e) => setProjForm({ ...projForm, titulo_projeto: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Projeto
                  </label>
                  <select
                    value={projForm.tipo_projeto}
                    onChange={(e) => setProjForm({ ...projForm, tipo_projeto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Rede Wi-Fi">Rede Wi-Fi</option>
                    <option value="CFTV">CFTV</option>
                    <option value="Rede Local">Rede Local (Cabeamento)</option>
                    <option value="Misto">Misto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={projForm.status}
                    onChange={(e) => setProjForm({ ...projForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Orçamento">Orçamento</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Responsável Técnico
                </label>
                <select
                  value={projForm.responsavel_tecnico_id}
                  onChange={(e) =>
                    setProjForm({ ...projForm, responsavel_tecnico_id: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  <option value="">Equipe Geral</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel_acesso})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações e Escopo do Projeto
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Passagem de cabos Cat6 Furukawa, instalação de patch panel e alinhamento de câmeras."
                  value={projForm.observacoes_projeto}
                  onChange={(e) => setProjForm({ ...projForm, observacoes_projeto: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProjetoModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProj}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 flex items-center gap-1.5"
                >
                  {savingProj ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Projeto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DETALHES, LAUDO E FECHAMENTO DA ORDEM DE SERVIÇO     */}
      {/* ============================================================== */}
      {selectedOSDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedOSDetails(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono leading-none">OS</span>
                <span className="text-base font-mono font-bold leading-none mt-0.5">
                  #{selectedOSDetails.numero_os}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedOSDetails.tipo_servico}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                    {selectedOSDetails.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aberto em {formatDate(selectedOSDetails.data_abertura)} • Técnico: {selectedOSDetails.tecnico_nome || 'Não atribuído'}
                </p>
              </div>
            </div>

            {osDetailsSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{osDetailsSuccess}</span>
              </div>
            )}

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 mb-5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Defeito / Relato Inicial:</span>
                  <p className="text-slate-200">{selectedOSDetails.relato_problema}</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveIaModal({
                      tipo: 'laudo_os',
                      targetId: selectedOSDetails.id,
                      contexto: {
                        clienteNome: nomeExibicao,
                        equipamentoInfo: selectedOSDetails.equipamento_info || undefined,
                        relatoProblemaOuDemanda: selectedOSDetails.relato_problema,
                        tipoServico: selectedOSDetails.tipo_servico,
                      },
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-950/40 shrink-0 cursor-pointer"
                >
                  <span>✨ Gerar Laudo com IA</span>
                </button>
              </div>

              {selectedOSDetails.equipamento_info && (
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Equipamento:</span>
                  <p className="text-cyan-300 font-mono">{selectedOSDetails.equipamento_info}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateOSDetails} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status do Chamado
                  </label>
                  <select
                    value={osEditData.status}
                    onChange={(e) => setOsEditData({ ...osEditData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="Aberta">Aberta</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Aguardando Peças">Aguardando Peças</option>
                    <option value="Concluída">Concluída (Finalizar OS)</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={osEditData.valor_total}
                    onChange={(e) =>
                      setOsEditData({ ...osEditData, valor_total: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Diagnóstico Técnico / Laudo
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva a causa raiz identificada (Ex: Fonte em curto, placa mãe oxidada, setores defeituosos no SSD)."
                  value={osEditData.diagnostico_tecnico}
                  onChange={(e) =>
                    setOsEditData({ ...osEditData, diagnostico_tecnico: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Serviços Executados & Peças Substituídas
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Troca da pasta térmica, instalação de SSD Kingston 480GB, formatação com Windows 11 Pro e backup dos dados."
                  value={osEditData.servicos_executados}
                  onChange={(e) =>
                    setOsEditData({ ...osEditData, servicos_executados: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedOSDetails(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={savingOSDetails}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5"
                >
                  {savingOSDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Laudo / Atualizar OS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: GERADOR DE LAUDOS E ESCOPOS COM IA (PROMPT 6)        */}
      {/* ============================================================== */}
      {activeIaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <GeradorLaudoIA
              tipo={activeIaModal.tipo}
              contexto={activeIaModal.contexto}
              initialData={{
                diagnostico_tecnico: osEditData.diagnostico_tecnico || '',
              }}
              onCancel={() => setActiveIaModal(null)}
              onSave={async (dados: LaudoIAData) => {
                // Atualizar estado da OS imediatamente na tela
                setOsEditData((prev) => ({
                  ...prev,
                  diagnostico_tecnico: dados.diagnostico_tecnico,
                  servicos_executados: dados.servicos_recomendados.join('\n• '),
                }))

                // Se houver OS selecionada, persistir no Neon DB
                if (activeIaModal.targetId) {
                  await sql`
                    UPDATE ordens_servico
                    SET
                      diagnostico_tecnico = ${dados.diagnostico_tecnico},
                      servicos_executados = ${dados.servicos_recomendados.join('\n• ')},
                      pecas_utilizadas = ${dados.materiais_ou_pecas_sugeridas},
                      termos_garantia = ${dados.termos_garantia}
                    WHERE id = ${activeIaModal.targetId}
                  `
                  loadClienteData()
                }

                setActiveIaModal(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
