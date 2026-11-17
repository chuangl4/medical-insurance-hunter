import { useState } from 'react';
import { QUALITY_RATINGS_SOURCE, QUALITY_RATINGS_YEAR } from '../data/qualityRatings';
import { qualityFor, starsText } from '../domain/quality';
import type { Plan } from '../domain/types';

/** The plan's CMS quality star rating, with a "?" that explains it. */
export function QualityRatingLine({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const rating = qualityFor(plan);
  return (
    <p className="network-rules">
      Quality rating:{' '}
      {rating?.overall ? (
        <span className="stars" aria-label={`${rating.overall} of 5 stars`}>
          {starsText(rating.overall)} <span className="muted">{rating.overall} of 5</span>
        </span>
      ) : (
        <span className="muted">not rated</span>
      )}{' '}
      <button
        type="button"
        className="help-button"
        aria-expanded={open}
        aria-label={`What the quality rating means for ${plan.name}`}
        title="What this means"
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span className="help-steps network-help">
          <span>
            The federal Quality Rating System scores each insurer’s plans of one type (here {rating?.planType ?? 'its plans'}) from 1 to 5 stars,
            the same stars Healthplanfinder shows. It rates the insurer, not a single plan.
          </span>
          {rating ? (
            <span>
              Medical care (preventive care, managing conditions): {rating.medicalCare ? `${rating.medicalCare} of 5` : 'too little data'} · Member experience
              (survey of members, including getting care quickly): {rating.memberExperience ? `${rating.memberExperience} of 5` : 'too little data'} · Plan
              administration (customer service, access to information): {rating.planAdministration ? `${rating.planAdministration} of 5` : 'too little data'}.
            </span>
          ) : (
            <span>CMS didn’t rate this insurer, usually because it is new to Washington’s market or has too few members. That isn’t a low score.</span>
          )}
          <span className="muted">
            CMS{' '}
            <a href={QUALITY_RATINGS_SOURCE} target="_blank" rel="noreferrer">
              plan year {QUALITY_RATINGS_YEAR} ratings
            </a>
            , built from the previous year’s data; the {QUALITY_RATINGS_YEAR + 1} ratings usually appear on Healthplanfinder before CMS posts the file.
          </span>
        </span>
      )}
    </p>
  );
}
