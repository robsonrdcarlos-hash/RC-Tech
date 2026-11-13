import React, { useState, useEffect, useCallback, useId } from 'react'
import { useAuth } from '@/context/AuthContext'
import { sql } from '@/lib/db'
import { formatDocument, formatPhone, formatCEP } from '@/lib/masks'
import { ClientePerfil } from './ClientePerfil'
import {
  Users,
  Search,
  Plus,
  Building2,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Server,
  Loader2,
  RefreshCw
} from 'lucide-react'

export interface Cliente {
  id: string
  tecnico_responsavel_id: string | null
  tipo_cliente: 'PF' | 'PJ'
  nome_fantasia_ou_razao: string
  razao_social?: string | null
  nome_fantasia?: string | null
  documento: string
  contato_responsavel?: string | null
  telefone?: string | null
  whatsapp?: string | null
  email?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  observacoes?: string | null
  infraestrutura_resumo?: string | null
  tecnico_nome?: string | null
  created_at?: string
}

interface TecnicoOption {
  id: string
  nome: string
  nivel_acesso: string
}

interface ClientesModuleProps {
  onOpenOS?: (clienteId: string) => void
  onOpenVisita?: (clienteId: string) => void
  initialClienteId?: string | null
}

export const ClientesModule: React.FC<ClientesModuleProps> = ({
  initialClienteId,
}) => {
  const { session } = useAuth()
  const tecnicoLogado = session?.tecnico
  const isAdmin = tecnicoLogado?.nivel_acesso === 'admin'
  const tecnicoId = tecnicoLogado?.id

  // Sub-visões: 'list' | 'create' | 'details'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list')
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(initialClienteId || null)

  // Estado da listagem
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Estado do formulário
  const [formTab, setFormTab] = useState<'dados_gerais' | 'endereco' | 'ti'>('dados_gerais')
  const [tecnicosList, setTecnicosList] = useState<TecnicoOption[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [isSearchingCep, setIsSearchingCep] = useState(false)

  // Dados do formulário
  const [formData, setFormData] = useState({
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
    tecnico_responsavel_id: tecnicoId || '',
    observacoes: '',
    infraestrutura_resumo: '',
  })

  // IDs únicos acessíveis para os campos de formulário
  const tipoClienteId = useId()
  const razaoSocialId = useId()
  const nomeFantasiaId = useId()
  const documentoId = useId()
  const contatoRespId = useId()
  const emailId = useId()
  const telefoneId = useId()
  const whatsappId = useId()
  const cepId = useId()
  const enderecoId = useId()
  const numeroId = useId()
  const complementoId = useId()
  const bairroId = useId()
  const cidadeId = useId()
  const estadoId = useId()
  const tecnicoRespId = useId()
  const infraId = useId()
  const obsId = useId()

  // 1. Carregar lista de clientes do Neon respeitando RLS / Nível de Acesso
  const loadClientes = useCallback(async () => {
    try {
      setRefreshing(true)
      let rows
      if (isAdmin || !tecnicoId) {
        rows = await sql`
          SELECT 
            c.*,
            t.nome as tecnico_nome
          FROM clientes c
          LEFT JOIN tecnicos t ON t.id = c.tecnico_responsavel_id
          ORDER BY c.created_at DESC NULLS LAST, c.nome_fantasia_ou_razao ASC
        `
      } else {
        rows = await sql`
          SELECT 
            c.*,
            t.nome as tecnico_nome
          FROM clientes c
          LEFT JOIN tecnicos t ON t.id = c.tecnico_responsavel_id
          WHERE c.tecnico_responsavel_id = ${tecnicoId} OR c.tecnico_responsavel_id IS NULL
          ORDER BY c.created_at DESC NULLS LAST, c.nome_fantasia_ou_razao ASC
        `
      }

      setClientes(
        rows.map((r) => ({
          id: r.id,
          tecnico_responsavel_id: r.tecnico_responsavel_id,
          tipo_cliente: r.tipo_cliente || 'PJ',
          nome_fantasia_ou_razao: r.nome_fantasia_ou_razao,
          razao_social: r.razao_social || r.nome_fantasia_ou_razao,
          nome_fantasia: r.nome_fantasia,
          documento: r.documento,
          contato_responsavel: r.contato_responsavel,
          telefone: r.telefone,
          whatsapp: r.whatsapp,
          email: r.email,
          endereco: r.endereco,
          numero: r.numero,
          complemento: r.complemento,
          bairro: r.bairro,
          cidade: r.cidade,
          estado: r.estado,
          cep: r.cep,
          observacoes: r.observacoes,
          infraestrutura_resumo: r.infraestrutura_resumo,
          tecnico_nome: r.tecnico_nome,
          created_at: r.created_at,
        }))
      )
    } catch (err) {
      console.error('Erro ao listar clientes:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAdmin, tecnicoId])

  // 2. Carregar lista de técnicos cadastrados para o dropdown
  const loadTecnicos = useCallback(async () => {
    try {
      const rows = await sql`
        SELECT id, nome, nivel_acesso 
        FROM tecnicos 
        ORDER BY nome ASC
      `
      setTecnicosList(
        rows.map((r) => ({
          id: r.id,
          nome: r.nome,
          nivel_acesso: r.nivel_acesso,
        }))
      )
    } catch (err) {
      console.warn('Erro ao carregar técnicos:', err)
    }
  }, [])

  useEffect(() => {
    loadClientes()
    loadTecnicos()
  }, [loadClientes, loadTecnicos])

  // Efeito ao selecionar cliente diretamente
  useEffect(() => {
    if (selectedClienteId) {
      setViewMode('details')
    }
  }, [selectedClienteId])

  // Busca de CEP automática via ViaCEP
  const handleCepBlur = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      try {
        setIsSearchingCep(true)
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        if (res.ok) {
          const data = await res.json()
          if (!data.erro) {
            setFormData((prev) => ({
              ...prev,
              endereco: data.logradouro || prev.endereco,
              bairro: data.bairro || prev.bairro,
              cidade: data.localidade || prev.cidade,
              estado: data.uf || prev.estado,
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

  // Filtragem na listagem (nome, razão, fantasia ou documento)
  const filteredClientes = clientes.filter((c) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    const nome = (c.nome_fantasia_ou_razao || '').toLowerCase()
    const razao = (c.razao_social || '').toLowerCase()
    const fantasia = (c.nome_fantasia || '').toLowerCase()
    const doc = (c.documento || '').toLowerCase().replace(/\D/g, '')
    const cleanQ = q.replace(/\D/g, '')

    return (
      nome.includes(q) ||
      razao.includes(q) ||
      fantasia.includes(q) ||
      (cleanQ && doc.includes(cleanQ)) ||
      (c.cidade || '').toLowerCase().includes(q)
    )
  })

  // Submissão do formulário de cadastro
  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    // Validação de campos obrigatórios: Tipo de Cliente, Nome/Razão Social e CPF/CNPJ
    const nomePrincipal = formData.razao_social.trim()
    const docLimpo = formData.documento.trim()

    if (!nomePrincipal) {
      setFormError('O campo Nome / Razão Social é obrigatório.')
      setFormTab('dados_gerais')
      return
    }

    if (!docLimpo) {
      setFormError('O campo CPF ou CNPJ é obrigatório.')
      setFormTab('dados_gerais')
      return
    }

    try {
      setIsSubmitting(true)

      const nomeFantasiaOuRazao = formData.nome_fantasia.trim() || nomePrincipal
      const tecId = formData.tecnico_responsavel_id || null

      const inserted = await sql`
        INSERT INTO clientes (
          tipo_cliente,
          nome_fantasia_ou_razao,
          razao_social,
          nome_fantasia,
          documento,
          contato_responsavel,
          telefone,
          whatsapp,
          email,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          tecnico_responsavel_id,
          observacoes,
          infraestrutura_resumo
        )
        VALUES (
          ${formData.tipo_cliente},
          ${nomeFantasiaOuRazao},
          ${nomePrincipal},
          ${formData.nome_fantasia.trim() || null},
          ${formData.documento},
          ${formData.contato_responsavel.trim() || null},
          ${formData.telefone.trim() || null},
          ${formData.whatsapp.trim() || null},
          ${formData.email.trim() || null},
          ${formData.cep.trim() || null},
          ${formData.endereco.trim() || null},
          ${formData.numero.trim() || null},
          ${formData.complemento.trim() || null},
          ${formData.bairro.trim() || null},
          ${formData.cidade.trim() || null},
          ${formData.estado.trim() || null},
          ${tecId},
          ${formData.observacoes.trim() || null},
          ${formData.infraestrutura_resumo.trim() || null}
        )
        RETURNING *
      `

      if (inserted && inserted.length > 0) {
        const novo = inserted[0]
        setFormSuccess('Cliente cadastrado com sucesso!')

        // Atualizar lista
        await loadClientes()

        // Redirecionar para o perfil do cliente recém cadastrado
        setTimeout(() => {
          setSelectedClienteId(novo.id)
          setViewMode('details')
          setIsSubmitting(false)
        }, 600)
      }
    } catch (err: unknown) {
      console.error('Erro ao cadastrar cliente:', err)
      const errObj = err as { message?: string; code?: string }
      if (errObj?.code === '23505' || errObj?.message?.includes('duplicate key') || errObj?.message?.includes('unique')) {
        setFormError('Já existe um cliente cadastrado com este mesmo CPF/CNPJ.')
      } else {
        setFormError(errObj?.message || 'Falha ao salvar cliente no banco de dados.')
      }
      setIsSubmitting(false)
    }
  }

  // Limpar form para novo cadastro
  const handleOpenNewForm = () => {
    setFormData({
      tipo_cliente: 'PJ',
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
      tecnico_responsavel_id: tecnicoId || '',
      observacoes: '',
      infraestrutura_resumo: '',
    })
    setFormTab('dados_gerais')
    setFormError(null)
    setFormSuccess(null)
    setViewMode('create')
  }

  // =========================================================================
  // RENDER 1: FORMULÁRIO DE CADASTRO (PÁGINA NOVA COM 3 ABAS)
  // =========================================================================
  if (viewMode === 'create') {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
        {/* Top Header do Form */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Voltar para a listagem"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
                Módulo de Clientes • Novo Registro
              </span>
              <h2 className="text-2xl font-extrabold text-white">Cadastrar Novo Cliente</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => handleSaveCliente(e)}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Cliente</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {formError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFormTab('dados_gerais')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              formTab === 'dados_gerais'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Aba 1 — Dados Gerais</span>
          </button>

          <button
            type="button"
            onClick={() => setFormTab('endereco')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              formTab === 'endereco'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Aba 2 — Endereço & Visitas</span>
          </button>

          <button
            type="button"
            onClick={() => setFormTab('ti')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              formTab === 'ti'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Aba 3 — Informações de TI</span>
          </button>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSaveCliente} className="space-y-6">
          {/* ============================================================== */}
          {/* ABA 1: DADOS GERAIS                                            */}
          {/* ============================================================== */}
          {formTab === 'dados_gerais' && (
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Identificação do Cliente</h3>
                <p className="text-xs text-slate-400">
                  Defina o tipo de pessoa e os dados cadastrais básicos da conta.
                </p>
              </div>

              {/* Tipo de Cliente (PF ou PJ) */}
              <div>
                <label htmlFor={tipoClienteId} className="block text-xs font-semibold text-slate-300 mb-2">
                  Tipo de Cliente <span className="text-cyan-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({ ...p, tipo_cliente: 'PJ', documento: '' }))
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                      formData.tipo_cliente === 'PJ'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 ${formData.tipo_cliente === 'PJ' ? 'text-cyan-400' : ''}`} />
                    <div>
                      <p className="text-xs font-bold">Pessoa Jurídica (PJ)</p>
                      <p className="text-[10px] text-slate-400">Empresas e comércios</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData((p) => ({ ...p, tipo_cliente: 'PF', documento: '' }))
                    }}
                    className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                      formData.tipo_cliente === 'PF'
                        ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className={`w-5 h-5 ${formData.tipo_cliente === 'PF' ? 'text-cyan-400' : ''}`} />
                    <div>
                      <p className="text-xs font-bold">Pessoa Física (PF)</p>
                      <p className="text-[10px] text-slate-400">Consumidor final / Residência</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Nomes e Documentos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor={razaoSocialId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {formData.tipo_cliente === 'PJ' ? 'Razão Social' : 'Nome Completo'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id={razaoSocialId}
                    type="text"
                    required
                    placeholder={formData.tipo_cliente === 'PJ' ? 'Ex: Tech Solutions Ltda' : 'Ex: João da Silva'}
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                {formData.tipo_cliente === 'PJ' ? (
                  <div>
                    <label htmlFor={nomeFantasiaId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nome Fantasia (Opcional)
                    </label>
                    <input
                      id={nomeFantasiaId}
                      type="text"
                      placeholder="Ex: Tech Solutions"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor={contatoRespId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Apelido / Preferência de contato
                    </label>
                    <input
                      id={contatoRespId}
                      type="text"
                      placeholder="Ex: Sr. Silva"
                      value={formData.contato_responsavel}
                      onChange={(e) => setFormData({ ...formData, contato_responsavel: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor={documentoId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {formData.tipo_cliente === 'PJ' ? 'CNPJ' : 'CPF'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id={documentoId}
                    type="text"
                    required
                    placeholder={formData.tipo_cliente === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    value={formData.documento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        documento: formatDocument(e.target.value, formData.tipo_cliente),
                      })
                    }
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                {formData.tipo_cliente === 'PJ' && (
                  <div>
                    <label htmlFor={contatoRespId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nome do Contato Responsável
                    </label>
                    <input
                      id={contatoRespId}
                      type="text"
                      placeholder="Ex: Falar com Carlos do Financeiro / TI"
                      value={formData.contato_responsavel}
                      onChange={(e) => setFormData({ ...formData, contato_responsavel: e.target.value })}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>
                )}
              </div>

              {/* Contatos */}
              <div className="pt-4 border-t border-slate-800/80">
                <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400 mb-4">
                  Canais de Contato
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor={telefoneId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Telefone Principal
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        id={telefoneId}
                        type="text"
                        placeholder="(11) 3333-4444"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                        className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={whatsappId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      WhatsApp Operacional
                    </label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                      <input
                        id={whatsappId}
                        type="text"
                        placeholder="(11) 99999-8888"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                        className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={emailId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                      E-mail Principal
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        id={emailId}
                        type="email"
                        placeholder="contato@empresa.com.br"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setFormTab('endereco')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Avançar para Endereço</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 2: ENDEREÇO                                                */}
          {/* ============================================================== */}
          {formTab === 'endereco' && (
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Localização e Ponto de Atendimento</h3>
                <p className="text-xs text-slate-400">
                  Fundamental para visitas técnicas presenciais, cálculo de deslocamento (km) e projetos de cabeamento/CFTV.
                </p>
              </div>

              {/* CEP com busca automática */}
              <div className="max-w-xs">
                <label htmlFor={cepId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                  CEP (Busca Automática)
                </label>
                <div className="relative">
                  <input
                    id={cepId}
                    type="text"
                    placeholder="00000-000"
                    value={formData.cep}
                    onBlur={handleCepBlur}
                    onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition"
                  />
                  {isSearchingCep && (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400 absolute right-3 top-3" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Digite o CEP e clique fora para preencher a rua, bairro e cidade via ViaCEP.
                </span>
              </div>

              {/* Logradouro e Número */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-3">
                  <label htmlFor={enderecoId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Endereço (Rua, Avenida, Alameda)
                  </label>
                  <input
                    id={enderecoId}
                    type="text"
                    placeholder="Ex: Av. Paulista"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor={numeroId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Número
                  </label>
                  <input
                    id={numeroId}
                    type="text"
                    placeholder="Ex: 1000"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor={complementoId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Complemento (Sala, Bloco, Andar)
                  </label>
                  <input
                    id={complementoId}
                    type="text"
                    placeholder="Ex: Sala 402 - Bloco B"
                    value={formData.complemento}
                    onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor={bairroId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Bairro
                  </label>
                  <input
                    id={bairroId}
                    type="text"
                    placeholder="Ex: Bela Vista"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label htmlFor={cidadeId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cidade
                  </label>
                  <input
                    id={cidadeId}
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor={estadoId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    id={estadoId}
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setFormTab('dados_gerais')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('ti')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Avançar para Info de TI</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: INFORMAÇÕES DE TI E OBSERVAÇÕES                         */}
          {/* ============================================================== */}
          {formTab === 'ti' && (
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  Contexto Técnico & Infraestrutura
                </h3>
                <p className="text-xs text-slate-400">
                  Informações operacionais para facilitar o suporte técnico, bancada e atendimentos de campo.
                </p>
              </div>

              {/* Técnico Responsável */}
              <div className="max-w-md">
                <label htmlFor={tecnicoRespId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Técnico Responsável pela Conta
                </label>
                <select
                  id={tecnicoRespId}
                  value={formData.tecnico_responsavel_id}
                  onChange={(e) => setFormData({ ...formData, tecnico_responsavel_id: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                >
                  <option value="">Nenhum técnico específico (Fila Geral)</option>
                  {tecnicosList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.nivel_acesso})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  O técnico responsável terá acesso prioritário e acompanhará o histórico deste cliente.
                </span>
              </div>

              {/* Infraestrutura Atual Resumida */}
              <div>
                <label htmlFor={infraId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Infraestrutura Atual Resumida
                </label>
                <textarea
                  id={infraId}
                  rows={3}
                  placeholder="Ex: Rede estruturada Cat6 Furukawa, Servidor Windows Server 2019, Switch HP 24 portas Gigabit, 10 estações Windows 11 Pro, CFTV IP Hikvision."
                  value={formData.infraestrutura_resumo}
                  onChange={(e) => setFormData({ ...formData, infraestrutura_resumo: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl p-4 text-sm text-white placeholder-slate-600 outline-none transition resize-none"
                />
              </div>

              {/* Observações Gerais */}
              <div>
                <label htmlFor={obsId} className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações Gerais e Acesso
                </label>
                <textarea
                  id={obsId}
                  rows={3}
                  placeholder="Ex: Empresa possui alarme monitorado (contatar zeladoria antes das 8h), chave do rack fica na recepção, não desligar modem no expediente."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl p-4 text-sm text-white placeholder-slate-600 outline-none transition resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormTab('endereco')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-950/50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Cliente...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Concluir Cadastro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    )
  }

  // =========================================================================
  // RENDER 2: DETALHES / PERFIL DO CLIENTE (DELEGADO AO CLIENTEPERFIL)
  // =========================================================================
  if (viewMode === 'details' && selectedClienteId) {
    return (
      <ClientePerfil
        clienteId={selectedClienteId}
        onBack={() => {
          setSelectedClienteId(null)
          setViewMode('list')
          loadClientes()
        }}
      />
    )
  }

  // =========================================================================
  // RENDER 3: LISTAGEM PRINCIPAL DE CLIENTES
  // =========================================================================
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Header com Botão "Novo Cliente" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Cadastros Base
          </span>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>Clientes & Contas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
              {clientes.length}
            </span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Gerenciamento central de empresas (PJ) e clientes particulares (PF) atendidos pela RC Tech.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadClientes()}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Recarregar clientes"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenNewForm}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca no Topo da Listagem */}
      <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar clientes por nome, razão social, nome fantasia, CPF ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-sm">Carregando base de clientes do Neon DB...</span>
        </div>
      ) : clientes.length === 0 ? (
        /* Caso não haja nenhum cliente cadastrado no banco */
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Nenhum cliente cadastrado ainda</h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6">
            Cadastre os clientes e empresas atendidas para iniciar a emissão de ordens de serviço, visitas técnicas e projetos de rede.
          </p>
          <button
            onClick={handleOpenNewForm}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Cliente</span>
          </button>
        </div>
      ) : filteredClientes.length === 0 ? (
        /* Caso a busca não retorne resultados */
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center">
          <Search className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            Nenhum cliente encontrado para &quot;{searchTerm}&quot;
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            Limpar filtro de pesquisa
          </button>
        </div>
      ) : (
        /* Grid de Cards de Clientes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((c) => {
            const displayName = c.nome_fantasia || c.razao_social || c.nome_fantasia_ou_razao
            const phone = c.whatsapp || c.telefone || 'Sem telefone'
            const location = c.cidade ? `${c.cidade} / ${c.estado || ''}` : 'Cidade não informada'

            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedClienteId(c.id)
                  setViewMode('details')
                }}
                className="bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          c.tipo_cliente === 'PJ'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {c.tipo_cliente === 'PJ' ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {c.tipo_cliente}
                        </span>
                      </div>
                    </div>

                    <span className="text-slate-500 group-hover:text-cyan-400 transition">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition line-clamp-1">
                    {displayName}
                  </h3>

                  {c.razao_social && c.nome_fantasia && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {c.razao_social}
                    </p>
                  )}

                  <p className="text-xs font-mono text-cyan-400/80 mt-1">
                    {c.documento}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono truncate">{phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
