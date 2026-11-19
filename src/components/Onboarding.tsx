import type { ReactNode } from 'react';
import { SAMPLE_MEMBER } from '../domain/profile';

interface Props {
  /** Plans on offer, for the browse button. */
  planCount: number;
  /** Someone has been added, so plans can be priced for this household rather than a sample adult. */
  hasPeople: boolean;
  /** Look at plans priced for a sample adult; setup stays open for next time. */
  onBrowse: () => void;
  /** Finish setup with what's been added so far. */
  onSeePlans: () => void;
  children: ReactNode;
}

/** First-time setup, full screen: page links appear once you browse plans or finish. */
export function Onboarding({ planCount, hasPeople, onBrowse, onSeePlans, children }: Props) {
  return (
    <div className="onboarding">
      <div className="onboarding-head">
        <p className="eyebrow">Set up · about 5 minutes</p>
        <h1>Let's get to know your household</h1>
        <p className="hero-lede">
          Who needs coverage, the care you expect next year, and the doctors and hospitals you want to keep. Then we'll show
          you the plans that fit. Chat with Scout, or fill in any part of your profile yourself.
        </p>
        <div className="onboarding-alt">
          {hasPeople ? (
            <>
              <button type="button" className="secondary" onClick={onSeePlans}>
                See plans with what you've added
              </button>
              <span className="hint">You can add the rest any time from Your household and needs.</span>
            </>
          ) : (
            <>
              <button type="button" className="secondary" onClick={onBrowse}>
                Browse all {planCount} plans first
              </button>
              <span className="hint">Prices will be for a sample {SAMPLE_MEMBER.age}-year-old until you add your household.</span>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
