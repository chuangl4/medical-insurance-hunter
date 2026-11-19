import type { User } from '../api';
import { ENROLLMENT, PLAN_YEAR } from '../domain/rules2027';
import { SignIn } from './SignIn';

const POINTS = [
  { title: 'Your doctors and hospitals', text: 'Every plan is checked against the people and places your family needs to keep.' },
  { title: 'Your prescriptions', text: "Each medication is looked up in every insurer's drug list, with its tier and any approval rules." },
  { title: 'Your real yearly cost', text: 'Premiums plus what your expected care would cost, priced for a typical year and a bad one.' },
];

/** What a signed-out visitor sees: what the app does, and a way in. */
export function Landing({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">King County, Washington · {PLAN_YEAR} plans</p>
        <h1>Find the health plan that fits your family, not just the cheapest premium.</h1>
        <p className="hero-lede">
          Tell us who needs coverage and the care you expect. We compare every on- and off-exchange plan sold in King County
          against it.
        </p>
        <ul className="hero-points">
          {POINTS.map((p) => (
            <li key={p.title}>
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
        <p className="hero-deadline">
          Enroll by <strong>{ENROLLMENT.januaryDeadline}</strong> for coverage starting January 1. Open enrollment ends{' '}
          {ENROLLMENT.closes}.
        </p>
      </section>
      <SignIn onSignedIn={onSignedIn} />
    </div>
  );
}
