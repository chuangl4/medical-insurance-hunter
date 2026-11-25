# Medical Insurance Hunter

A local web app for comparing 2027 King County, Washington health plans against a family's income and expected care.

Plan data lives in `src/data/kingCounty2027.ts`, which lists its sources. Results are estimates, so confirm a plan's details on its official summary before enrolling.

## How it works

You sign in with Google. Your profile (the people who need coverage, their ages, and a list of expected care for each person) is saved on the server, so it loads on any computer you sign in from.

New users are greeted by Scout, a setup chat that asks for what plan selection needs: who needs coverage and their ages, whether you live in King County, each person's expected care, must-have doctors and hospitals, and, only while a premium tax credit is possible, tax household, income, job-based coverage offers, and immigration status. You can answer in your own words and add more than was asked. The server sends the conversation to the Claude API, which turns answers into profile details such as specialist visits, lab tests, drug fills, or medication paid without insurance. Each reply lists what it saved, with Undo, and everything stays editable in the form. The list of what is still needed is worked out by the app (`src/domain/onboarding.ts`), not by the model.

Doctors and hospitals you list are must-haves by default. A doctor can instead be a candidate at one insurer (someone you'd see if you chose it): candidates show only on that insurer's plans, never hide a plan, and aren't checked automatically.

For a must-have doctor, the app looks them up automatically in the national provider registry (NPPES), picks the match when it is clear, then checks their clinic's and health system's websites for accepted insurance, using Claude with web search (`server/doctors.ts`). It also checks whether Premera's public provider directory lists the doctor; that directory doesn't say which network, so it's only a hint. Website findings show as "likely" or "likely out" on each plan, and a ? next to each status lists what the app tried and what is left to confirm. Plans are hidden only after you mark a doctor out of network for that insurer yourself, since clinic sites list insurers rather than plans and can be out of date.

The Plans page also shows hospital access for ten Seattle-area hospitals (your must-haves, specialty centers such as Fred Hutch, Seattle Children's and Harborview, and other nearby hospitals). Hospitals contract by network, not insurer, so each plan is mapped to its network (`src/data/planNetworks.ts`; Ambetter's standard and Cascade Select networks are separate). Each cell uses the hospital's own published list of individual plans where it has one (`src/data/hospitalLists.ts`, with source and year), including conditions such as "authorized specialty care only", and falls back to Washington Healthplanfinder's facility search (`src/data/facilityNetworks.ts`). Where the two disagree, the grid and plan cards flag it. Must-have hospitals filter the plan list using the same lists.

Each plan card also shows, from the plan's own 2027 Summary of Benefits and Coverage (`npm run network-rules`, `src/data/networkRules.ts`):

- Network rules: HMO or EPO, whether specialists need a referral, and out-of-network coverage, with a link to the insurer's own provider directory for that network (`src/data/providerDirectories.ts`).
- Plan rules: urgent care away from the network, emergency rules (such as a notice deadline), services the summary says need prior approval, and what's not covered or also covered. A summary that lists no prior approvals doesn't mean none are needed, and the app says so.
- Quality: CMS quality star ratings and members' answers from the federal enrollee survey, compared with the national middle (`npm run quality-ratings`, `src/data/qualityRatings.ts`), plus where to look up complaints with the Insurance Commissioner.

Medications can be linked to RxNorm, the National Library of Medicine's drug database. Each linked drug is looked up automatically in every insurer's 2027 drug list (see below), and you can set your own answer per insurer, which wins and is flagged where it disagrees. Coverage is kept per plan (covered at a tier, or not covered) in the encrypted profile, and each plan prices the drug accordingly: through its drug benefit, counting toward the deductible and out-of-pocket limit, or at the cash price when it doesn't cover it. Non-preferred brand and specialty cost shares are in the plan data for Cascade Care plans and Premera's Preferred plans; elsewhere the preferred-brand share is used and marked as an estimate. A drug a plan doesn't list is shown as "Not on drug list · exception possible": costs count it as cash unless your scenario assumes the exception is approved, and a ? explains the exception process, that insurer's published criteria (`src/data/exceptionPolicies.ts`), and what each fill would cost if approved.

Each plan shows two yearly costs. **Your scenario** prices the care you set in the scenario panel, opened with "Change" next to Your scenario on any plan card or in the comparison table: how much of your listed visits and tests to count, unplanned care (hospital stays, ER visits, a major bill) for one person, and per medication whether you take it and, where a plan doesn't list it, whether to assume an exception is approved. Presets fill the controls, and the scenario is saved with your profile, so it follows you to other browsers (`src/domain/scenarios.ts`). **Worst case** is premiums plus the out-of-pocket limit plus medications paid in cash. Each medication shows its fills in your scenario, such as "9 × $300 (full price, toward the deductible) + 3 × $250 (after the deductible)".

A household saved in the browser by earlier versions moves into your account the first time you sign in.

## Set up

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (git ignores `.env`):
   - `GOOGLE_CLIENT_ID`: in Google Cloud Console, create an OAuth client ID of type Web application, and add `http://localhost:5173` (and your deployed URL) as Authorized JavaScript origins.
   - `ALLOWED_EMAILS`: the Google accounts allowed to sign in. Required in production.
   - `ADMIN_EMAILS` (optional): accounts that see a banner when hand-maintained data is due for a refresh. See "Keeping data current" below.
   - `PROFILE_KEY`: run `openssl rand -base64 32`. Profiles are encrypted with it, so back it up privately; without it, saved profiles can't be read.
   - `ANTHROPIC_API_KEY`: from platform.claude.com. Without it, the setup chat is off and you fill in the form instead.
   - For local testing without Google, set `DEV_LOGIN_EMAIL` (and include it in `ALLOWED_EMAILS`). The server refuses to start with it in production.
3. `npm run dev` starts the API on port 3002 and the web app on http://localhost:5173.

Run the tests with `npm test`.

Other data builds: `npm run network-rules` reads every plan's 2027 benefit summary (addresses in `src/data/sbcSources.ts` and the insurers' patterns), and `npm run quality-ratings -- <plan year>` reads CMS's quality rating and enrollee survey files.

Drug lists from insurers that publish machine-readable files are built into `server/formularies/` with `npm run formularies` (downloads several hundred MB; rerun when insurers update their lists). Insurers that only publish PDF drug lists are converted once with `npm run formularies:pdf` (needs `ANTHROPIC_API_KEY`; Claude reads each list's legend and Haiku copies each page's rows, cached, about $2 for all six lists). The sources are in `src/data/formularySources.ts`.

`npm run formularies:check` reports when an insurer has changed its drug list (or posted a newer one) since the last build, and exits with code 1 so it can run on a schedule; after rebuilding, run it with `--record`. Lists change during the year, so check about monthly, and at the start of open enrollment. On a Mac, `scripts/formulary-check-scheduled.sh` can run it from launchd (for example monthly) and shows a notification when something changed.

Accuracy, checked 2026-11-16 against Washington Healthplanfinder's prescription search: 89 of 90 drug-and-insurer answers matched (10 drugs, 9 insurers). The one miss came from Molina's interim 2026 list.

## Serve from your Mac

`npm run serve` backs up the database if the last copy is over a day old, builds the app, and serves it at http://localhost:3101, keeping the Mac awake. Ctrl-C stops it. It uses the same folder and database as `npm run dev`, which can keep running, and leaves out the tester sign-in. Code changes reach it the next time it starts. Use Chrome or Firefox on localhost; Safari may not keep the Secure session cookie there.

- `npm run serve -- --tailnet` also opens it to your own Tailscale devices, at `https://<this Mac>.<tailnet>.ts.net:8443`.
- `npm run serve -- --public` also opens it to the internet at that address, through Tailscale Funnel. Only `ALLOWED_EMAILS` can sign in, but scanners will find it, so stop it when it isn't needed.

Add each address you use, with its port, to the Google client's Authorized JavaScript origins. Backups go to `~/medical-insurance-hunter-backups` (change with `BACKUP_DIR`), last 7 kept; copy them, and `PROFILE_KEY` separately, somewhere off this Mac.

## Deploy

On the server, from a fresh clone: `npm ci`, `npm run build`, then `npm start`. It serves the app and API on `PORT` (default 3002), listening on 127.0.0.1 unless `HOST` is set. Put it behind HTTPS (for example Caddy or nginx), since the session cookie is marked Secure in production. The database lives in `DATA_DIR` (default `data/`); back it up along with `PROFILE_KEY`.

## Where things live

- `server/`: Express API, Google sign-in and sessions, encrypted SQLite storage (`node:sqlite`), and the setup chat with Scout (`chat.ts`), which uses Claude
- `src/domain/profile.ts`: profiles and care items, and how they turn into the counts used for costing
- `src/domain/rules2027.ts`: yearly subsidy rules, poverty guidelines, age curve, and care price assumptions, with sources
- `src/domain/calc.ts`: premiums, tax credit estimate, and out-of-pocket costs
- `src/domain/filter.ts`: filtering and sorting
- `src/data/hospitalNetworks.ts`: the hospitals the app checks, and each plan's status at them
- `src/data/planNetworks.ts`: each plan's provider network
- `src/data/hospitalLists.ts`: hospitals' own published plan lists, by network, with conditions, sources and dates
- `src/data/facilityNetworks.ts`: hospital access by insurer from Healthplanfinder, with the date checked
- `src/domain/hospitalAccess.ts`: combines the two, and flags disagreements
- `src/data/networkRules.ts`, `src/domain/networkRules.ts`: network and plan rules read from benefit summaries
- `src/data/qualityRatings.ts`, `src/domain/quality.ts`: CMS star ratings and member survey
- `src/data/providerDirectories.ts`, `src/data/exceptionPolicies.ts`: insurers' directory links and drug exception policies
- `src/domain/drugs.ts`, `server/formularyData.ts`: drug coverage from insurers' drug lists
- `src/domain/freshness.ts`: hand-maintained data, its age limits, and how to refresh it
- `src/components/`: sign-in, profile and care editors, plan browser, and comparison table

## Must-have hospitals

Each account picks its own must-have hospitals in its profile (Your household and needs, under doctors and hospitals). The hospitals to choose from are in `src/data/facilityNetworks.ts`; network status comes from each hospital's own list in `src/data/hospitalLists.ts` when there is one, else from Healthplanfinder. To add a hospital, add it to `FACILITIES` and, if it publishes a plan list, to `HOSPITAL_LISTS`. Nothing personal belongs in tracked files: family details live only in each account's encrypted profile.

## Keeping data current

Some data is collected by hand or by scripts and goes stale: plans and premiums, hospitals' own plan lists, Healthplanfinder's hospital search, plan rules from benefit summaries, insurers' drug lists, CMS quality ratings, provider directory links, and drug exception policies. `src/domain/freshness.ts` lists each with its last-checked date, how old it may get, and how to refresh it; it also flags sources for an older plan year (such as a drug list still for last year). Accounts in `ADMIN_EMAILS` see a banner at the top of the app when anything is due. After refreshing a dataset, update its date (the `..._CHECKED` constant in the data file, or rerun its script). Refresh everything before each open enrollment (it starts November 1).

## Not modeled yet

Cost-sharing reductions, Cascade Care Savings amounts, network depth (how many specialists each network has near you; insurers don't publish comparable data for Washington individual plans, so the app links to each insurer's directory instead), limits that appear only in full plan contracts, catastrophic plans, and counties other than King.
