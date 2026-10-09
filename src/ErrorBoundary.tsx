import { Component, type ErrorInfo, type ReactNode } from 'react';
import { log, buildReport } from './diagnostics';

interface Props { children: ReactNode; scope?: string; onReset?: () => void; compact?: boolean }
interface State { error: Error | null }

/**
 * Intercepte les erreurs d'affichage : au lieu d'une zone qui ne réagit plus, l'utilisateur voit
 * un message, peut réessayer, recharger ou télécharger le rapport de diagnostic.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log('error', `Erreur d'affichage${this.props.scope ? ` (${this.props.scope})` : ''} : ${error.message}`,
      { message: error.message, stack: error.stack?.split('\n').slice(0, 8).join('\n'), composants: info.componentStack?.split('\n').slice(0, 8).join('\n') });
  }

  private reset = () => { this.setState({ error: null }); this.props.onReset?.(); };

  private download = () => {
    const url = URL.createObjectURL(new Blob([buildReport()], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'diagnostic-poteaux-ec2.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  render() {
    if (!this.state.error) return this.props.children;
    const box = this.props.compact ? 'm-4' : 'min-h-screen flex items-center justify-center p-6 bg-gray-50';
    return (
      <div className={box} role="alert">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-[15px] font-bold text-red-700 mb-1">Une erreur d'affichage est survenue{this.props.scope ? ` — ${this.props.scope}` : ''}</h2>
          <p className="text-[13px] text-gray-600 mb-2">Vos données sont conservées. Vous pouvez réessayer, recharger la page ou télécharger le rapport de diagnostic pour le transmettre au support.</p>
          <p className="text-[12px] font-mono bg-gray-50 border border-gray-100 rounded p-2 mb-3 break-words">{this.state.error.message}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={this.reset} className="text-[13px] font-semibold text-white bg-primary rounded-md px-3 h-9">Réessayer</button>
            <button onClick={() => window.location.reload()} className="text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9">Recharger la page</button>
            <button onClick={this.download} className="text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9">Rapport de diagnostic</button>
          </div>
        </div>
      </div>
    );
  }
}
