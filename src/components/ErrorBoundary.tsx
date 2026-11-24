import { Component, type ReactNode } from 'react';

/**
 * Keeps one broken screen from blanking the whole app: the rest of the app
 * (menu, other screens) keeps working, and the farmer gets a way out.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onHome: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-clay/40 bg-clay-soft/60 p-5">
        <p className="text-lg font-bold">This screen hit a problem</p>
        <p className="mt-1 text-ink-2">Your records are safe on this phone. Go back to Home and try again; if it keeps happening, save a backup and tell us what you were doing.</p>
        <button
          type="button"
          className="btn btn-primary mt-4"
          onClick={() => {
            this.setState({ error: null });
            this.props.onHome();
          }}
        >
          Go to Home
        </button>
      </div>
    );
  }
}
