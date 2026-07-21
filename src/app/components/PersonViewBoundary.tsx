import React from 'react';

interface Props {
  children: React.ReactNode;
  personName?: string;
  onNavigate?: (view: string) => void;
}

interface State {
  hasError: boolean;
}

// Catches any render error inside a member's Well so a single bad profile
// never blanks the whole app. Shows a warm fallback + a way back to the Hub.
export class PersonViewBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PersonView] render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const name = this.props.personName || 'this member';
      return (
        <section className="cr-view">
          <div className="person-header">
            <button className="back-btn" onClick={() => this.props.onNavigate?.('hub')}>← Hub</button>
          </div>
          <div className="person-tab-content">
            <div className="hd-daily-prompt">
              <span className="hd-daily-icon">🌊</span>
              <div>
                <div className="hd-daily-label">This Well hit a snag</div>
                <div className="hd-daily-text">
                  Something in {name}'s Well didn't load right. Your data is safe — nothing was lost.
                  Head back to the Hub and try again, or let Monny know if it keeps happening.
                </div>
              </div>
            </div>
            <button className="btn-add" style={{ marginTop: '16px' }} onClick={() => this.props.onNavigate?.('hub')}>
              ← Back to the Hub
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
