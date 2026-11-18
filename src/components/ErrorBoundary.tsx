import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'

interface Props {
  children: ReactNode
  moduleName?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ModuleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ModuleErrorBoundary] Erro capturado no módulo:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 max-w-lg shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Não foi possível carregar {this.props.moduleName || 'este módulo'}
            </h2>

            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Ocorreu uma falha inesperada durante a renderização dos dados.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left font-mono text-xs text-rose-300 mb-6 overflow-x-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  if (this.props.onReset) this.props.onReset()
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>

              <button
                onClick={() => {
                  window.location.hash = 'dashboard'
                  window.location.reload()
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Voltar ao Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

