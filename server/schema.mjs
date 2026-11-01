import { z } from 'zod';
import { ADKAR_KEYS, PROSCI_PHASES } from './settings.mjs';

export const FUNCTIONS = ['Business', 'Operations', 'Technology', 'Security', 'Risk & compliance', 'Change & adoption', 'Customer / end user', 'Finance'];
export const PRIORITIES = ['Must have', 'Should have', 'Could have', "Won't have this release"];
const text = (max = 3000) => z.string().trim().max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, 'Use a valid date');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const timezoneSchema = z.string().min(1).max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; } }, 'Use an IANA timezone such as Australia/Sydney');
export const availabilitySchema = z.array(z.object({ day: z.number().int().min(0).max(6), start: time, end: time }).refine(v => v.start < v.end, 'Availability must end after it starts')).min(1).max(7);
export const stakeholderInput = z.object({
  name: text(100).min(2), role: text(120).min(2), email: z.union([z.string().email().max(254), z.literal('')]).default(''),
  function: z.enum(FUNCTIONS), timezone: timezoneSchema.default('Australia/Sydney'), availability: availabilitySchema,
});
export const engagementInput = z.object({
  title: text(120).min(3), problem: text(4000).min(10), owner: text(100).min(2),
  type: z.enum(['new', 'existing']), solutionId: text(120).nullable().default(null),
  baseline: text(6000).default(''), desiredChange: text(6000).default(''),
  scopeIn: text(4000).min(3), scopeOut: text(4000).default(''),
  objectives: text(4000).default(''), constraints: text(4000).default(''),
  startDate: date, sessionMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30),
  stakeholders: z.array(stakeholderInput).min(1).max(12),
}).superRefine((v, ctx) => {
  if (v.type === 'existing' && !v.solutionId) ctx.addIssue({ code: 'custom', path: ['solutionId'], message: 'Select a repository solution' });
  if (v.type === 'existing' && (!v.baseline.trim() || !v.desiredChange.trim())) ctx.addIssue({ code: 'custom', path: ['desiredChange'], message: 'Existing solutions need an as-is baseline and proposed change' });
});
export const answerInput = z.object({
  questionId: text(120).min(1), text: text(6000).default(''), disposition: z.enum(['answered', 'unknown', 'skipped', 'out-of-scope']).default('answered'),
  // MoSCoW is auto-adjusted from the question; a stakeholder may still override it.
  priority: z.enum(PRIORITIES).optional(), prioritySource: z.enum(['auto', 'stakeholder']).default('auto'),
  expectedVersion: z.number().int().nonnegative(), continueEarly: z.boolean().optional(),
}).superRefine((v, ctx) => { if (v.disposition !== 'unknown' && v.disposition !== 'skipped' && !v.text.trim()) ctx.addIssue({ code: 'custom', path: ['text'], message: 'Add an answer, or explicitly choose I don’t know' }); });
export const detailInput = z.object({ text: text(3000).min(20), expectedVersion: z.number().int().nonnegative() });
export const timeBudgetInput = z.object({ minutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.null()]), expectedVersion: z.number().int().nonnegative() });
export const activityInput = z.object({
  status: z.enum(['active', 'paused', 'on-break', 'resume']), note: text(300).default(''), minutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(15),
  expectedVersion: z.number().int().nonnegative().optional(),
});
export const reminderInput = z.object({ message: text(500).default(''), expectedVersion: z.number().int().nonnegative() });
export const changeManagementInput = z.object({
  enabled: z.boolean().default(false),
  adkar: z.object(Object.fromEntries(ADKAR_KEYS.map(key => [key, z.boolean().default(true)]))).default({}),
  phases: z.object(Object.fromEntries(PROSCI_PHASES.map(key => [key, z.boolean().default(true)]))).default({}),
  changeReview: z.boolean().default(false),
});
export const changeManagementPatch = z.object({
  expectedVersion: z.number().int().nonnegative(), enabled: z.boolean().optional(),
  adkar: z.object(Object.fromEntries(ADKAR_KEYS.map(key => [key, z.boolean().optional()]))).optional(),
  phases: z.object(Object.fromEntries(PROSCI_PHASES.map(key => [key, z.boolean().optional()]))).optional(),
  changeReview: z.boolean().optional(),
});
export const workspaceSettingsInput = z.object({
  changeManagement: changeManagementInput.default({}),
  reminders: z.object({ auto: z.boolean().default(true), idleMinutes: z.number().int().min(5).max(240).default(20), maxPerDay: z.number().int().min(1).max(10).default(3), cooldownMinutes: z.number().int().min(15).max(1440).default(120) }).default({}),
  interview: z.object({ askTimeBudget: z.boolean().default(true), timeBudgetMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).default(30), parallelSittings: z.boolean().default(true) }).default({}),
});
export const stakeholderAddInput = stakeholderInput.extend({ sessionMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional() });
export const reviewInput = z.object({
  area: z.enum(['business', 'technical', 'security', 'change']), reviewer: text(100).min(2), role: text(120).min(2),
  decision: z.enum(['approved', 'changes-requested']), notes: text(4000).default(''), expectedVersion: z.number().int().nonnegative(),
}).superRefine((v, ctx) => { if (v.notes.length < 10) ctx.addIssue({ code: 'custom', path: ['notes'], message: 'Record the evidence reviewed and any reservations (at least 10 characters)' }); });
export const resolutionInput = z.object({ resolution: text(4000).min(10), expectedVersion: z.number().int().nonnegative() });
export const verificationAnswerInput = z.object({ text: text(6000).min(10), expectedVersion: z.number().int().nonnegative() });
export const changePlanInput = z.object({
  sponsor: text(100).default(''), impact: text(5000).default(''),
  adkar: z.object(Object.fromEntries(['awareness', 'desire', 'knowledge', 'ability', 'reinforcement'].map(k => [k, z.object({ action: text(1500).default(''), owner: text(100).default(''), measure: text(500).default('') })]))),
  expectedVersion: z.number().int().nonnegative(),
});
export const catalogSchema = z.object({ schemaVersion: z.literal(1), description: z.string().max(2000).optional(), solutions: z.array(z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/), name: text(120).min(2), category: text(100).min(1), version: text(60).min(1),
  owner: text(100).min(1), status: text(80).min(1), description: text(2000).min(1), repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  sourcePath: text(300).min(1).refine(v => !v.startsWith('/') && !v.split('/').includes('..'), 'Use a repository-relative source path'),
  systems: z.array(text(150)).max(30).default([]), tags: z.array(text(80)).max(20).default([]),
}).superRefine((v, ctx) => { if (v.status === 'Documentation only' && !/not.*(deployed|production)|specification.only/i.test(v.description + ' ' + v.category)) ctx.addIssue({ code: 'custom', path: ['description'], message: 'Clearly identify specification-only entries as not deployed' }); })).max(200) }).superRefine((v, ctx) => { if (new Set(v.solutions.map(s => s.id)).size !== v.solutions.length) ctx.addIssue({ code: 'custom', message: 'Solution IDs must be unique' }); });
