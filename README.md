# Medical Insurance Hunter

A local web app for comparing 2027 King County, Washington health plans against a family's income and expected care.

Plan data lives in `src/data/kingCounty2027.ts`, which lists its sources. Results are estimates, so confirm a plan's details on its official summary before enrolling.

## Run it

```sh
npm install
npm run dev
```

Run the tests with `npm test`.

## Where things live

- `src/domain/rules2027.ts`: yearly subsidy rules, poverty guidelines, age curve, and care price assumptions, with sources
- `src/domain/calc.ts`: premiums, tax credit estimate, and out-of-pocket costs
- `src/data/careNeeds.ts`: ongoing care starting points and medications paid without insurance
- `src/domain/filter.ts`: filtering and sorting
- `src/data/hospitalNetworks.ts`: hospital network status, using your personal presets
- `src/components/`: household form, plan browser, and comparison table

Household details are saved only in your browser's local storage.

## Personal presets

To add your own care presets, medications, and required hospitals, create `src/data/personal/config.ts`. Git ignores that folder, so keep personal details there rather than in tracked files. The app works without it.

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
