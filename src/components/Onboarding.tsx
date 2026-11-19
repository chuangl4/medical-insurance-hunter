import type { ReactNode } from 'react';

interface Props {
  mode: 'chat' | 'form';
  onMode: (mode: 'chat' | 'form') => void;
  children: ReactNode;
}

/** First-time setup, full screen: no page links until there's a household to price plans for. */
export function Onboarding({ mode, onMode, children }: Props) {
  return (
    <div className="onboarding">
      <div className="onboarding-head">
        <p className="eyebrow">Set up · about 5 minutes</p>
        <h1>Let's get to know your household</h1>
        <p className="hero-lede">
          Who needs coverage, the care you expect next year, and the doctors and hospitals you want to keep. Then we'll show
          you the plans that fit.
        </p>
        <div className="segmented" role="group" aria-label="How to answer">
          <button type="button" aria-pressed={mode === 'chat'} onClick={() => onMode('chat')}>
            Chat with Scout
          </button>
          <button type="button" aria-pressed={mode === 'form'} onClick={() => onMode('form')}>
            Fill in a form
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
