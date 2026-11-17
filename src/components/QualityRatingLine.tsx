import { useState } from 'react';
import { MEMBER_SURVEY_NATIONAL_MEDIAN, MEMBER_SURVEY_SOURCE, QUALITY_RATINGS_SOURCE, QUALITY_RATINGS_YEAR } from '../data/qualityRatings';
import {
  COMPANY_LOOKUP_URL,
  LEGAL_NAMES,
  SURVEY_LABELS,
  compareToNation,
  qualityFor,
  starsText,
  surveyFor,
  surveyScoreText,
  type SurveyMeasure,
} from '../domain/quality';
import type { Plan } from '../domain/types';

/** The plan's CMS quality star rating, with a "?" that explains it. */
export function QualityRatingLine({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const rating = qualityFor(plan);
  const survey = surveyFor(plan);
  const legalName = LEGAL_NAMES[plan.carrier] ?? plan.carrier;
  return (
    <div className="network-rules">
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
          {survey ? (
            <span>
              <strong>What members said</strong> ({survey.respondents} members surveyed; compared with the middle of all insurers nationally):
              <ul className="survey-list">
                {(Object.keys(SURVEY_LABELS) as SurveyMeasure[]).map((m) => {
                  const score = survey[m];
                  const vs = compareToNation(m, score);
                  return (
                    <li key={m}>
                      {SURVEY_LABELS[m]}:{' '}
                      {score === null ? (
                        'too few answers'
                      ) : (
                        <>
                          {surveyScoreText(m, score)} <span className={`survey-${vs}`}>({vs === 'typical' ? 'typical' : `${vs} typical`})</span>
                          <span className="muted"> · national middle {surveyScoreText(m, MEMBER_SURVEY_NATIONAL_MEDIAN[m])}</span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <span className="muted">
                With about {survey.respondents} answers, gaps under 5 points are within survey noise.{' '}
                <a href={MEMBER_SURVEY_SOURCE} target="_blank" rel="noreferrer">
                  CMS enrollee survey
                </a>
                , adjusted for members’ age, health and education.
              </span>
            </span>
          ) : (
            <span>No member survey results for this insurer (too new or too few members).</span>
          )}
          <span>
            <strong>Complaints:</strong> the Insurance Commissioner keeps each company’s complaint history. Search “{legalName}” in its{' '}
            <a href={COMPANY_LOOKUP_URL} target="_blank" rel="noreferrer">
              company lookup
            </a>
            . Counts aren’t adjusted for company size and include all of the company’s business.
          </span>
          <span className="muted">
            CMS{' '}
            <a href={QUALITY_RATINGS_SOURCE} target="_blank" rel="noreferrer">
              plan year {QUALITY_RATINGS_YEAR} ratings
            </a>
            , built from the previous year’s data; the {QUALITY_RATINGS_YEAR + 1} ratings usually appear on Healthplanfinder before CMS posts the file.
          </span>
        </span>
      )}
    </div>
  );
}
