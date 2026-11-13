# Medical Insurance Hunter

A local web app for comparing 2027 King County, Washington health plans against a family's income and expected care.

Plan data lives in `src/data/kingCounty2027.ts`, which lists its sources. Results are estimates, so confirm a plan's details on its official summary before enrolling.

## How it works

You sign in with Google. Your profile (the people who need coverage, their ages, and a list of expected care for each person) is saved on the server, so it loads on any computer you sign in from.

New users are greeted by Scout, a setup chat that asks for what plan selection needs: who needs coverage and their ages, whether you live in King County, each person's expected care, must-have doctors and hospitals, and, only while a premium tax credit is possible, tax household, income, job-based coverage offers, and immigration status. You can answer in your own words and add more than was asked. The server sends the conversation to the Claude API, which turns answers into profile details such as specialist visits, lab tests, drug fills, or medication paid without insurance. Each reply lists what it saved, with Undo, and everything stays editable in the form. The list of what is still needed is worked out by the app (`src/domain/onboarding.ts`), not by the model.

A household saved in the browser by earlier versions moves into your account the first time you sign in.

## Set up

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (git ignores `.env`):
   - `GOOGLE_CLIENT_ID`: in Google Cloud Console, create an OAuth client ID of type Web application, and add `http://localhost:5173` (and your deployed URL) as Authorized JavaScript origins.
   - `ALLOWED_EMAILS`: the Google accounts allowed to sign in. Required in production.
   - `PROFILE_KEY`: run `openssl rand -base64 32`. Profiles are encrypted with it, so back it up privately; without it, saved profiles can't be read.
   - `ANTHROPIC_API_KEY`: from platform.claude.com. Without it, the setup chat is off and you fill in the form instead.
   - For local testing without Google, set `DEV_LOGIN_EMAIL` (and include it in `ALLOWED_EMAILS`). The server refuses to start with it in production.
3. `npm run dev` starts the API on port 3001 and the web app on http://localhost:5173.

Run the tests with `npm test`.

## Deploy

On the server, from a fresh clone (so no personal presets get bundled): `npm ci`, `npm run build`, then `npm start`. It serves the app and API on `PORT` (default 3001). Put it behind HTTPS (for example Caddy or nginx), since the session cookie is marked Secure in production. The database lives in `DATA_DIR` (default `data/`); back it up along with `PROFILE_KEY`.

## Where things live

- `server/`: Express API, Google sign-in and sessions, encrypted SQLite storage (`node:sqlite`), and the setup chat with Scout (`chat.ts`), which uses Claude
- `src/domain/profile.ts`: profiles and care items, and how they turn into the counts used for costing
- `src/domain/rules2027.ts`: yearly subsidy rules, poverty guidelines, age curve, and care price assumptions, with sources
- `src/domain/calc.ts`: premiums, tax credit estimate, and out-of-pocket costs
- `src/domain/filter.ts`: filtering and sorting
- `src/data/hospitalNetworks.ts`: hospital network status, using your personal presets
- `src/components/`: sign-in, profile and care editors, plan browser, and comparison table

## Personal presets

To add hospitals the app can check networks for, and notes the setup chat can reuse (such as cash prices you've looked up), create `src/data/personal/config.ts`. Git ignores that folder, so keep personal details there rather than in tracked files. The app works without it.

```ts
import type { PersonalConfig } from '../personalConfig';

const config: PersonalConfig = {
  careNeeds: {
    example: { label: 'Example care', adds: '2 specialist visits', care: { specialistVisits: 2 } },
  },
  selfPayDrugs: { exampleDrug: { label: 'Example drug', monthlyCost: 50 } },
  hospitals: {
    exampleHospital: {
      name: 'Example Hospital',
      source: 'https://example.com/accepted-insurance',
      status: (plan) => (plan.carrier === 'Molina' ? 'in' : 'unknown'),
    },
  },
  requiredHospitals: ['exampleHospital'],
};

export default config;
```

## Not modeled yet

Cost-sharing reductions, Cascade Care Savings amounts, whether specific doctors and drugs are covered, specialty drugs, catastrophic plans, and counties other than King.
