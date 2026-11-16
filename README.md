# Medical Insurance Hunter

A local web app for comparing 2027 King County, Washington health plans against a family's income and expected care.

Plan data lives in `src/data/kingCounty2027.ts`, which lists its sources. Results are estimates, so confirm a plan's details on its official summary before enrolling.

## How it works

You sign in with Google. Your profile (the people who need coverage, their ages, and a list of expected care for each person) is saved on the server, so it loads on any computer you sign in from.

New users are greeted by Scout, a setup chat that asks for what plan selection needs: who needs coverage and their ages, whether you live in King County, each person's expected care, must-have doctors and hospitals, and, only while a premium tax credit is possible, tax household, income, job-based coverage offers, and immigration status. You can answer in your own words and add more than was asked. The server sends the conversation to the Claude API, which turns answers into profile details such as specialist visits, lab tests, drug fills, or medication paid without insurance. Each reply lists what it saved, with Undo, and everything stays editable in the form. The list of what is still needed is worked out by the app (`src/domain/onboarding.ts`), not by the model.

For a must-have doctor, the app looks them up automatically in the national provider registry (NPPES), picks the match when it is clear, then checks their clinic's and health system's websites for accepted insurance, using Claude with web search (`server/doctors.ts`). It also checks whether Premera's public provider directory lists the doctor; that directory doesn't say which network, so it's only a hint. Website findings show as "likely" or "likely out" on each plan, and a ? next to each status lists what the app tried and what is left to confirm. Plans are hidden only after you mark a doctor out of network for that insurer yourself, since clinic sites list insurers rather than plans and can be out of date.

The Plans page also shows hospital access by insurer for ten Seattle-area hospitals (your must-haves, specialty centers such as Fred Hutch, Seattle Children's and Harborview, and other nearby hospitals), from Washington Healthplanfinder's facility search (`src/data/facilityNetworks.ts`, dated). Where it disagrees with a must-have hospital's own insurance list, the grid and plan cards flag it; the plan filter keeps following the hospital list.

Medications can be linked to RxNorm, the National Library of Medicine's drug database. Each linked drug is looked up automatically in every insurer's 2027 drug list (see below), and you can set your own answer per insurer, which wins and is flagged where it disagrees. Coverage is kept per plan (covered at a tier, or not covered) in the encrypted profile, and each plan prices the drug accordingly: through its drug benefit, counting toward the deductible and out-of-pocket limit, or at the cash price when it doesn't cover it. Non-preferred brand and specialty cost shares are in the plan data for Cascade Care plans and Premera's Preferred plans; elsewhere the preferred-brand share is used and marked as an estimate.

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

Drug lists from insurers that publish machine-readable files are built into `server/formularies/` with `npm run formularies` (downloads several hundred MB; rerun when insurers update their lists). Insurers that only publish PDF drug lists are converted once with `npm run formularies:pdf` (needs `ANTHROPIC_API_KEY`; Claude reads each list's legend and Haiku copies each page's rows, cached, about $2 for all six lists). The sources are in `src/data/formularySources.ts`.

## Deploy

On the server, from a fresh clone (so no personal presets get bundled): `npm ci`, `npm run build`, then `npm start`. It serves the app and API on `PORT` (default 3001). Put it behind HTTPS (for example Caddy or nginx), since the session cookie is marked Secure in production. The database lives in `DATA_DIR` (default `data/`); back it up along with `PROFILE_KEY`.

## Where things live

- `server/`: Express API, Google sign-in and sessions, encrypted SQLite storage (`node:sqlite`), and the setup chat with Scout (`chat.ts`), which uses Claude
- `src/domain/profile.ts`: profiles and care items, and how they turn into the counts used for costing
- `src/domain/rules2027.ts`: yearly subsidy rules, poverty guidelines, age curve, and care price assumptions, with sources
- `src/domain/calc.ts`: premiums, tax credit estimate, and out-of-pocket costs
- `src/domain/filter.ts`: filtering and sorting
- `src/data/hospitalNetworks.ts`: hospital network status, using your personal presets
- `src/data/facilityNetworks.ts`: hospital access by insurer from Healthplanfinder, with the date checked
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

Cost-sharing reductions, Cascade Care Savings amounts, networks of individual doctors (beyond the website hints above), automatic drug coverage lookups (coverage is entered per insurer), specialty drugs, catastrophic plans, and counties other than King.
