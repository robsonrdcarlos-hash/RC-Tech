import React, { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Wrench,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ShieldCheck,
  Package,
  Layers,
  HelpCircle,
  X
} from 'lucide-react'

export interface LaudoIAData {
  diagnostico_tecnico: string
  servicos_recomendados: string[]
  materiais_ou_pecas_sugeridas: string[]
  termos_garantia: string
}

interface GeradorLaudoIAProps {
  tipo: 'laudo_os' | 'escopo_projeto'
  contexto: {
    clienteNome?: string
    equipamentoInfo?: string
    relatoProblemaOuDemanda?: string
    tipoServico?: string
    historico?: string
  }
  initialData?: Partial<LaudoIAData>
  onSave: (dados: LaudoIAData) => Promise<void> | void
  onCancel?: () => void
}

const LOADING_MESSAGES = [
  'Conectando ao modelo Gemini da Google...',
  'Analisando histórico técnico e relato do cliente...',
  'Identificando padrões e causa-raiz de TI...',
  'Sugerindo materiais, procedimentos e termos de garantia...',
  'Finalizando formatação estruturada do laudo...',
]

export const GeradorLaudoIA: React.FC<GeradorLaudoIAProps> = ({
  tipo,
  contexto,
  initialData,
  onSave,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Estado interativo e totalmente editável
  const [laudo, setLaudo] = useState<LaudoIAData>({
    diagnostico_tecnico: initialData?.diagnostico_tecnico || '',
    servicos_recomendados: initialData?.servicos_recomendados || [],
    materiais_ou_pecas_sugeridas: initialData?.materiais_ou_pecas_sugeridas || [],
    termos_garantia: initialData?.termos_garantia || '',
  })

  const [novoServico, setNovoServico] = useState('')
  const [novaPeca, setNovaPeca] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(Boolean(initialData?.diagnostico_tecnico))

  // Disparo da IA
  const handleGerarComIA = async () => {
    // Confirmação caso já existam dados inseridos manualmente para não sobrescrever sem aviso
    if (
      (laudo.diagnostico_tecnico.trim() || laudo.servicos_recomendados.length > 0) &&
      !window.confirm('Deseja gerar uma nova sugestão com IA? O texto atual será atualizado.')
    ) {
      return
    }

    setIsLoading(true)
    setToastMessage(null)
    setLoadingMsgIndex(0)

    // Intervalo com mensagens dinâmicas solicitadas
    const timer = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 1800)

    const payload = {
      tipo,
      dados_do_contexto: `
Cliente: ${contexto.clienteNome || 'Cliente não informado'}
Equipamento: ${contexto.equipamentoInfo || 'Não informado'}
Relato / Demanda: ${contexto.relatoProblemaOuDemanda || 'Análise preventiva'}
Tipo de Serviço: ${contexto.tipoServico || 'Suporte Técnico'}
Histórico Adicional: ${contexto.historico || 'Nenhum'}
      `.trim(),
      cliente: contexto.clienteNome,
      equipamento: contexto.equipamentoInfo,
      problema: contexto.relatoProblemaOuDemanda,
      tipo_servico: contexto.tipoServico,
    }

    try {
      const res = await fetch('/api/gerar-laudo-ou-escopo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error(`Falha no servidor (status ${res.status})`)
      }

      const raw = await res.json()

      // Validação com try/catch para garantir integridade do JSON
      let data: LaudoIAData
      try {
        data = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch (parseErr) {
        console.error('Erro de parse no retorno da IA:', parseErr)
        throw new Error('Formato retornado inválido.')
      }

      setLaudo({
        diagnostico_tecnico: data.diagnostico_tecnico || '',
        servicos_recomendados: Array.isArray(data.servicos_recomendados) ? data.servicos_recomendados : [],
        materiais_ou_pecas_sugeridas: Array.isArray(data.materiais_ou_pecas_sugeridas) ? data.materiais_ou_pecas_sugeridas : [],
        termos_garantia: data.termos_garantia || '',
      })

      setHasGenerated(true)
      setToastMessage({
        type: 'success',
        text: 'Laudo/Escopo gerado com sucesso via IA! Você pode editar qualquer campo abaixo antes de salvar.',
      })
    } catch (err) {
      console.error('Erro ao chamar /api/gerar-laudo-ou-escopo:', err)
      // Mensagem amigável de contingência solicitada pelo Prompt 6
      setToastMessage({
        type: 'error',
        text: 'Não foi possível gerar a sugestão com IA no momento. Deseja preencher os campos manualmente?',
      })
    } finally {
      clearInterval(timer)
      setIsLoading(false)
    }
  }

  // Adicionar e remover passos de serviços
  const handleAddServico = () => {
    if (novoServico.trim()) {
      setLaudo((p) => ({
        ...p,
        servicos_recomendados: [...p.servicos_recomendados, novoServico.trim()],
      }))
      setNovoServico('')
    }
  }

  const handleRemoveServico = (index: number) => {
    setLaudo((p) => ({
      ...p,
      servicos_recomendados: p.servicos_recomendados.filter((_, i) => i !== index),
    }))
  }

  // Adicionar e remover peças/materiais
  const handleAddPeca = () => {
    if (novaPeca.trim()) {
      setLaudo((p) => ({
        ...p,
        materiais_ou_pecas_sugeridas: [...p.materiais_ou_pecas_sugeridas, novaPeca.trim()],
      }))
      setNovaPeca('')
    }
  }

  const handleRemovePeca = (index: number) => {
    setLaudo((p) => ({
      ...p,
      materiais_ou_pecas_sugeridas: p.materiais_ou_pecas_sugeridas.filter((_, i) => i !== index),
    }))
  }

  // Persistir laudo na OS/Projeto
  const handleConfirmSave = async () => {
    if (!laudo.diagnostico_tecnico.trim()) {
      setToastMessage({
        type: 'error',
        text: 'Por favor, preencha o diagnóstico técnico antes de salvar.',
      })
      return
    }

    try {
      setIsSaving(true)
      await onSave(laudo)
      setToastMessage({
        type: 'success',
        text: 'Laudo e escopo registrados com sucesso no banco de dados Neon!',
      })
    } catch (err) {
      console.error('Erro ao salvar laudo:', err)
      setToastMessage({
        type: 'error',
        text: 'Ocorreu um erro ao salvar o laudo no banco.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 relative">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm flex items-start justify-between gap-3 animate-in fade-in duration-200 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <HelpCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header com Botão de Disparo da IA em Destaque */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Google Gen AI • Gemini 2.5 Flash</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              JSON Estruturado
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">
            {tipo === 'laudo_os'
              ? 'Laudo Técnico Automatizado da Ordem de Serviço'
              : 'Escopo Técnico Detalhado do Projeto'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gere diagnóstico, procedimentos, peças e termos de garantia com um clique e edite livremente.
          </p>
        </div>

        {/* Botão em Destaque "✨ Gerar Laudo/Escopo com IA" */}
        <button
          type="button"
          onClick={handleGerarComIA}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50 disabled:cursor-not-allowed group shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span className="text-slate-950">Processando IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition" />
              <span>{hasGenerated ? '✨ Regenerar com IA' : '✨ Gerar Laudo/Escopo com IA'}</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Visual com Mensagens Dinâmicas */}
      {isLoading && (
        <div className="p-8 bg-slate-950/80 border border-cyan-500/30 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {LOADING_MESSAGES[loadingMsgIndex]}
            </p>
            <span className="text-xs text-slate-400">
              A inteligência artificial está estruturando a terminologia técnica padrão Brasil.
            </span>
          </div>
        </div>
      )}

      {/* Interface Interativa e Totalmente Editável */}
      <div className="space-y-6">
        {/* 1. Diagnóstico Técnico */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Diagnóstico Técnico / Análise Especializada *</span>
            </span>
            <span className="text-[10px] text-slate-400">Totalmente editável</span>
          </label>
          <textarea
            rows={4}
            value={laudo.diagnostico_tecnico}
            onChange={(e) => setLaudo({ ...laudo, diagnostico_tecnico: e.target.value })}
            placeholder="O laudo detalhado gerado pela IA aparecerá aqui, ou você pode redigi-lo manualmente..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 outline-none leading-relaxed transition resize-none"
          />
        </div>

        {/* 2. Serviços / Procedimentos Recomendados (Lista Editável) */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Serviços & Procedimentos Recomendados</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {laudo.servicos_recomendados.length} etapas
            </span>
          </label>

          {laudo.servicos_recomendados.length > 0 && (
            <div className="space-y-2">
              {laudo.servicos_recomendados.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-slate-200 group"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const updated = [...laudo.servicos_recomendados]
                        updated[idx] = e.target.value
                        setLaudo({ ...laudo, servicos_recomendados: updated })
                      }}
                      className="bg-transparent border-0 text-white w-full outline-none focus:text-cyan-300 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveServico(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-80 group-hover:opacity-100"
                    title="Remover procedimento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Campo para adicionar novo serviço manual */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar outro procedimento técnico manual..."
              value={novoServico}
              onChange={(e) => setNovoServico(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddServico()
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={handleAddServico}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {/* 3. Materiais / Peças Sugeridas (Lista Editável) */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              <span>Materiais e Peças Sugeridas</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400">
              {laudo.materiais_ou_pecas_sugeridas.length} itens
            </span>
          </label>

          {laudo.materiais_ou_pecas_sugeridas.length > 0 && (
            <div className="space-y-2">
              {laudo.materiais_ou_pecas_sugeridas.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-slate-200 group"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono flex items-center justify-center shrink-0">
                      •
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const updated = [...laudo.materiais_ou_pecas_sugeridas]
                        updated[idx] = e.target.value
                        setLaudo({ ...laudo, materiais_ou_pecas_sugeridas: updated })
                      }}
                      className="bg-transparent border-0 text-white w-full outline-none focus:text-indigo-300 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePeca(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-80 group-hover:opacity-100"
                    title="Remover peça"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar peça manual */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar peça ou insumo manual (Ex: SSD NVMe 500GB, Cabo Cat6)..."
              value={novaPeca}
              onChange={(e) => setNovaPeca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddPeca()
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none"
            />
            <button
              type="button"
              onClick={handleAddPeca}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {/* 4. Termos de Garantia e Recomendações */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Termos de Garantia & Recomendações Finais</span>
          </label>
          <textarea
            rows={2}
            value={laudo.termos_garantia}
            onChange={(e) => setLaudo({ ...laudo, termos_garantia: e.target.value })}
            placeholder="Ex: 90 dias para mão de obra e peças substituídas conforme CDC..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none transition resize-none"
          />
        </div>
      </div>

      {/* Rodapé de Persistência */}
      <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setLaudo({
                diagnostico_tecnico: '',
                servicos_recomendados: [],
                materiais_ou_pecas_sugeridas: [],
                termos_garantia: '',
              })
            }
            className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar Campos</span>
          </button>
        </div>

        {/* Botão "Salvar Laudo/Documento" que atualiza no Neon */}
        <button
          type="button"
          onClick={handleConfirmSave}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-950/40"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Persistindo no Neon DB...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Salvar Laudo / Documento no Banco</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

