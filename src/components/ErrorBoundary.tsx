import { Component, type ErrorInfo, type ReactNode } from 'react';
import { resetLocalDbState } from '../data/mockDatabase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Ocorreu um erro inesperado na interface.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  private handleRecover = () => {
    try {
      resetLocalDbState();
    } catch {
      // Ignore storage error
    }
    this.setState({ hasError: false, message: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 text-center space-y-4">
            <h1 className="text-lg font-bold text-stone-900">
              Algo inesperado aconteceu
            </h1>
            <p className="text-sm text-stone-600">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="min-h-10 px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
            >
              Restaurar Dados Locais e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
