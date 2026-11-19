import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** First-time setup, full screen: no page links until there's a household to price plans for. */
export function Onboarding({ children }: Props) {
  return (
    <div className="onboarding">
      <div className="onboarding-head">
        <p className="eyebrow">Set up · about 5 minutes</p>
        <h1>Let's get to know your household</h1>
        <p className="hero-lede">
          Who needs coverage, the care you expect next year, and the doctors and hospitals you want to keep. Then we'll show
          you the plans that fit. Chat with Scout, or fill in any part of your profile yourself.
        </p>
      </div>
      {children}
    </div>
  );
}
