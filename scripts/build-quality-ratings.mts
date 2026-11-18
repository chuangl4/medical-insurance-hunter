/**
 * Builds src/data/qualityRatings.ts from two CMS public use files, for Washington insurers (by HIOS issuer ID):
 * - the Nationwide Quality Rating System (QRS) file: the 1–5 star ratings shown on Healthplanfinder and HealthCare.gov;
 * - the QHP Enrollee Experience Survey file: members' own answers, on CMS's 0–100 scale, with the national median.
 *
 *   npm run quality-ratings -- [planYear]     (default 2026; CMS posts each year's file in the fall)
 *
 * Source: https://www.cms.gov/marketplace/about/health-insurance-quality-initiatives/downloads
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const year = process.argv[2] ?? '2026';
const url = `https://www.cms.gov/files/zip/qrs-nationwide-puf-py${year}.zip`;
const dir = mkdtempSync(path.join(os.tmpdir(), 'mih-qrs-'));
try {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (medical-insurance-hunter)' } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  writeFileSync(path.join(dir, 'puf.zip'), Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', '-o', path.join(dir, 'puf.zip'), '-d', dir]);
  const csvFile = readdirSync(dir).find((f) => f.endsWith('.csv'));
  if (!csvFile) throw new Error('No CSV in the download');
  const [header, ...lines] = readFileSync(path.join(dir, csvFile), 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = header.split(',');
  const at = (row: string[], name: string) => row[cols.indexOf(name)]?.trim();
  const star = (v: string | undefined) => (v && /^[1-5]$/.test(v) ? Number(v) : null);
  const ratings: Record<string, unknown> = {};
  for (const line of lines) {
    const row = line.split(',');
    if (at(row, 'State') !== 'WA') continue;
    ratings[at(row, 'Issuer_Id')!] = {
      planType: at(row, 'Plan_Type'),
      overall: star(at(row, 'Global_rate')),
      medicalCare: star(at(row, 'S1_rate')),
      memberExperience: star(at(row, 'S2_rate')),
      planAdministration: star(at(row, 'S3_rate')),
    };
  }
  // The enrollee survey file is a spreadsheet: read its shared strings and first sheet directly.
  const surveyUrl = `https://www.cms.gov/files/zip/enrollee-survey-puf-py${year}.zip`;
  const sres = await fetch(surveyUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (medical-insurance-hunter)' } });
  if (!sres.ok) throw new Error(`${surveyUrl} answered ${sres.status}`);
  writeFileSync(path.join(dir, 'survey.zip'), Buffer.from(await sres.arrayBuffer()));
  execFileSync('unzip', ['-q', '-o', path.join(dir, 'survey.zip'), '-d', path.join(dir, 'survey')]);
  const book = readdirSync(path.join(dir, 'survey')).find((f) => /PUF\.xlsx$/i.test(f));
  if (!book) throw new Error('No survey spreadsheet in the download');
  const xml = (part: string) => execFileSync('unzip', ['-p', path.join(dir, 'survey', book), part], { maxBuffer: 1 << 28 }).toString('utf8');
  const strings = [...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
  const sheetRows = [...xml('xl/worksheets/sheet1.xml').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const cells: Record<string, string> = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const v = c[3].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? c[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
      cells[c[1]] = /t="s"/.test(c[2]) ? strings[Number(v)] : v;
    }
    return cells;
  });
  const colOf = Object.fromEntries(Object.entries(sheetRows[0]).map(([col, name]) => [name, col]));
  const MEASURES = {
    planRating: 'RATE_HP_SCORE_ADJ',
    careRating: 'RATE_HEALTH_CARE_SCORE_ADJ',
    gettingNeededCare: 'GETNEEDEDCARE_SCORE_ADJ',
    gettingCareQuickly: 'GETCAREQUICK_SCORE_ADJ',
    customerService: 'CUSTOMERSERVICE_SCORE_ADJ',
  } as const;
  const num = (v: string | undefined) => (v && /^\d+(\.\d+)?$/.test(v) ? Math.round(Number(v)) : null);
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.floor(s.length / 2)]); };
  const nationalMedian = Object.fromEntries(
    Object.entries(MEASURES).map(([key, name]) => [key, median(sheetRows.slice(1).map((r) => num(r[colOf[name]])).filter((v): v is number => v !== null))]),
  );
  const survey: Record<string, unknown> = {};
  for (const r of sheetRows.slice(1)) {
    const [issuer, state] = (r[colOf.REPORTING_UNIT_ID] ?? '').split('-');
    if (state !== 'WA') continue;
    survey[issuer] = {
      respondents: Number(r[colOf.N_COMPLETED_SURVEYS]),
      ...Object.fromEntries(Object.entries(MEASURES).map(([key, name]) => [key, num(r[colOf[name]])])),
    };
  }

  const out = `import type { MemberSurvey, QualityRating } from '../domain/types';

/**
 * CMS Quality Rating System star ratings (1–5) for Washington insurers, by HIOS issuer ID (the first five
 * characters of a plan ID). null means CMS had too little data to rate it. Insurers missing here weren't rated,
 * usually because they are new to the market or have too few members.
 * Generated by \`npm run quality-ratings\` from ${url} on ${new Date().toISOString().slice(0, 10)}.
 */
export const QUALITY_RATINGS_YEAR = ${year};
export const QUALITY_RATINGS_BUILT = '${new Date().toISOString().slice(0, 10)}';
export const QUALITY_RATINGS_SOURCE = '${url}';
export const QUALITY_RATINGS: Record<string, QualityRating> = ${JSON.stringify(ratings, null, 2)};

/**
 * Members' answers from the CMS QHP Enrollee Experience Survey (case-mix adjusted, CMS's 0–100 scale: a 0–10 rating
 * times 10, or an Always/Usually/Sometimes/Never average rescaled), by issuer ID, with the national median of all
 * rated insurers. Generated from ${surveyUrl}.
 */
export const MEMBER_SURVEY_SOURCE = '${surveyUrl}';
export const MEMBER_SURVEY_NATIONAL_MEDIAN: Record<Exclude<keyof MemberSurvey, 'respondents'>, number> = ${JSON.stringify(nationalMedian, null, 2)};
export const MEMBER_SURVEY: Record<string, MemberSurvey> = ${JSON.stringify(survey, null, 2)};
`;
  writeFileSync(path.resolve(import.meta.dirname, '../src/data/qualityRatings.ts'), out);
  console.log(`Ratings for ${Object.keys(ratings).length} and member surveys for ${Object.keys(survey).length} Washington insurers (plan year ${year}).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
