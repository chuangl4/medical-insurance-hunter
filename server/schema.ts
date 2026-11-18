import { z } from 'zod';
import { CLINIC_FINDINGS, LOOKUP_OUTCOMES } from '../src/domain/doctors';
import { DRUG_TIERS, RESTRICTIONS } from '../src/domain/drugs';
import { CASH_REASONS } from '../src/domain/cashMeds';
import { ANSWER_KEYS, CARE_CATEGORIES } from '../src/domain/profile';

const text = (max: number) => z.string().trim().max(max);

export const careItemSchema = z.object({
  id: text(80).min(1),
  name: text(120),
  category: z.enum(CARE_CATEGORIES),
  perYear: z.number().int().min(0).max(366),
  monthlyCost: z.number().min(0).max(100_000).nullable(),
  notes: text(500),
  cashReason: z.enum(CASH_REASONS).optional(),
  drug: z.object({ rxcui: z.string().regex(/^\d{1,10}$/), name: text(300).min(1) }).optional(),
});

const planDrugStatus = { covered: z.boolean(), tier: z.enum(DRUG_TIERS).optional(), restrictions: z.array(z.enum(RESTRICTIONS)).max(3).optional() };
const drugCoverageSchema = z.object({
  checkedAt: text(40),
  source: text(300),
  plans: z.record(text(80), z.object(planDrugStatus)),
  fromLists: z
    .record(
      text(80),
      z.object({
        ...planDrugStatus,
        evidence: z.object({
          kind: text(40),
          url: text(600),
          planYear: z.number().int().min(2020).max(2100),
          row: text(300).optional(),
          asGeneric: z.boolean().optional(),
          assumption: text(400).optional(),
        }),
      }),
    )
    .optional(),
  listsCheckedAt: text(40).optional(),
});

export const doctorSchema = z.object({
  npi: z.string().regex(/^\d{10}$/),
  name: text(120).min(1),
  credential: text(40),
  specialty: text(120),
  locations: z.array(text(200)).max(10),
});

const url = text(500).refine((u) => /^https?:\/\//.test(u), 'Must be a web address.');

export const clinicCheckSchema = z.object({
  checkedAt: text(40),
  summary: text(1500),
  clinicName: text(200),
  clinicUrl: url.nullable(),
  hospitalId: text(60).nullable(),
  carriers: z
    .array(z.object({ carrier: text(80), finding: z.enum(CLINIC_FINDINGS), detail: text(500), url: url.nullable() }))
    .max(20),
  premeraListed: z.boolean().nullable(),
});

const lookupSchema = z.object({
  registry: z
    .object({
      at: text(40),
      query: text(130),
      outcome: z.enum(LOOKUP_OUTCOMES),
      detail: text(300),
      candidates: z.array(doctorSchema).max(25),
    })
    .optional(),
  websites: z
    .object({ at: text(40), npi: text(10), outcome: z.enum(['found', 'error']), detail: text(300) })
    .optional(),
});

export const profileSchema = z.object({
  version: z.literal(1),
  members: z
    .array(
      z.object({
        id: text(80).min(1),
        label: text(60),
        age: z.number().int().min(0).max(120),
        careItems: z.array(careItemSchema).max(100),
        needsAge: z.boolean().optional(),
        careReviewed: z.boolean().optional(),
      }),
    )
    .max(15),
  taxHouseholdSize: z.number().int().min(1).max(20),
  annualIncome: z.number().min(0).max(100_000_000).nullable(),
  overSubsidyLimit: z.boolean(),
  filingStatus: z.enum(['single', 'joint', 'separate']),
  immigration: z.enum(['citizen', 'qualified', 'other']),
  affordableEmployerOffer: z.boolean(),
  inKingCounty: z.boolean().optional(),
  providers: z
    .array(
      z.object({
        id: text(80).min(1),
        name: text(120),
        hospitalId: text(60).nullable(),
        doctor: doctorSchema.optional(),
        clinicCheck: clinicCheckSchema.optional(),
        confirmed: z.record(text(80), z.enum(['in', 'out'])).optional(),
        lookup: lookupSchema.optional(),
        candidateFor: text(80).optional(),
        note: text(160).optional(),
      }),
    )
    .max(30)
    .optional(),
  answered: z.array(z.enum(ANSWER_KEYS)).max(ANSWER_KEYS.length).optional(),
  drugCoverage: z
    .record(z.string().regex(/^\d{1,10}$/), drugCoverageSchema)
    .refine((r) => Object.keys(r).length <= 40, 'Too many drugs.')
    .optional(),
  scenario: z
    .object({
      listedCare: z.union([z.literal(0), z.literal(0.5), z.literal(1), z.literal(2)]),
      hospitalStays: z.number().int().min(0).max(5),
      erVisits: z.number().int().min(0).max(10),
      majorBill: z.number().min(0).max(10_000_000),
      forMember: text(80).nullable(),
      approved: z.array(z.string().regex(/^\d{1,10}$/)).max(40),
      stopped: z.array(text(80)).max(100),
    })
    .optional(),
});

export const drugSearchSchema = z.object({ name: text(100).min(2) });
export const drugCoverageRequestSchema = z.object({ rxcui: z.string().regex(/^\d{1,10}$/) });

export const chatRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: text(4000).min(1) }))
    .min(1)
    .max(200)
    .refine((m) => m[m.length - 1].role === 'user', 'The last message must be from the user.'),
  profile: profileSchema,
  hints: z.array(text(300)).max(30).default([]),
  knownHospitals: z.array(z.object({ id: text(60).min(1), name: text(120).min(1) })).max(30).default([]),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const doctorSearchSchema = z.object({
  first: text(60),
  last: text(60).min(2),
  city: text(60).default(''),
});

export const doctorCheckSchema = z.object({
  doctor: doctorSchema,
  carriers: z.array(text(80).min(1)).min(1).max(20),
  hospitals: z.array(z.object({ id: text(60).min(1), name: text(120).min(1) })).max(30).default([]),
});
export type DoctorCheckRequest = z.infer<typeof doctorCheckSchema>;
