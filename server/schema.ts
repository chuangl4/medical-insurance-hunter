import { z } from 'zod';
import { ANSWER_KEYS, CARE_CATEGORIES } from '../src/domain/profile';

const text = (max: number) => z.string().trim().max(max);

export const careItemSchema = z.object({
  id: text(80).min(1),
  name: text(120),
  category: z.enum(CARE_CATEGORIES),
  perYear: z.number().int().min(0).max(366),
  monthlyCost: z.number().min(0).max(100_000).nullable(),
  notes: text(500),
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
    .array(z.object({ id: text(80).min(1), name: text(120), hospitalId: text(60).nullable() }))
    .max(30)
    .optional(),
  answered: z.array(z.enum(ANSWER_KEYS)).max(ANSWER_KEYS.length).optional(),
});

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
