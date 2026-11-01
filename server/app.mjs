import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { aiEnabled, AI_MODEL, generateQuestion, synthesize, elaborateAnswer } from './ai.mjs';
import { nextQuestion, PART_PHASES, PART_NAMES } from './questions.mjs';
import { calendarFor, findAvailableSlot } from './scheduler.mjs';
import { catalogSchema, answerInput, verificationAnswerInput, resolutionInput, workspaceSettingsInput } from './schema.mjs';
import { fetchCatalog, repositoryConfig, mergeCatalog } from './catalog.mjs';
import { buildMarkdown, handoffContext } from './markdown.mjs';
import { readChangelog } from './changelog.mjs';
import { engagementProgress, pacingFor, effectiveActivity, sweepReminders, notificationFeed, markNotificationsRead } from './progress.mjs';
import { defaultWorkspaceSettings, changeManagementOf } from './settings.mjs';
import { AppError, assert, createEngagement, issueInvite, publicEngagement, publicPerson, occupiedSlots, saveAnswer, completeInterview, answerVerification, resolveVerification, reopenInterview, saveReview, saveChangePlan, setChangeManagement, addStakeholder, setTimeBudget, recordActivity, sendReminder, saveDetail, elaborateFor, gateReasons, requirementsFor, summary, audit, syncStage, hashToken, version, reviewAreas, requiredReviewAreas } from './domain.mjs';

const VERSION = '13.0.0';
const equal = (a, b) => { const x = createHash('sha256').update(String(a)).digest(); const y = createHash('sha256').update(String(b)).digest(); return timingSafeEqual(x, y); };
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
export function createApp(store, options = {}) {
  const app = express(); app.disable('x-powered-by'); const proxyHops = options.proxyHops ?? Number(process.env.TRUST_PROXY_HOPS || 0); if (Number.isInteger(proxyHops) && proxyHops > 0) app.set('trust proxy', proxyHops);
  const accessToken = options.accessToken ?? process.env.WORKSPACE_ACCESS_TOKEN ?? '';
  const secureCookies = options.secureCookies ?? process.env.SECURE_COOKIES === 'true';
  const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN ?? '';
  const secret = store.snapshot().secret;
  const settingsNow = () => { try { return store.settings(); } catch { return defaultWorkspaceSettings(); } };
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" });
    if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store'); next();
  });
  app.use(express.json({ limit: '160kb' }));
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      try { if (new URL(req.headers.origin).origin !== (publicOrigin || new URL(req.headers.origin).protocol + '//' + req.get('host'))) return res.status(403).json({ error: 'Cross-origin changes are not allowed.' }); } catch { return res.status(403).json({ error: 'Invalid request origin.' }); }
    }
    next();
  });
  const buckets = new Map();
  const rate = (max, windowMs) => (req, res, next) => { const key = `${req.ip}:${max}`; const now = Date.now(); let b = buckets.get(key); if (!b || now - b.start > windowMs) { b = { start: now, count: 0 }; buckets.set(key, b); } if (++b.count > max) return res.status(429).json({ error: 'Too many requests. Please wait a moment and retry.' }); next(); };
  const cleanup = setInterval(() => { for (const [key, b] of buckets) if (Date.now() - b.start > 600000) buckets.delete(key); }, 60000); cleanup.unref();
  app.use('/api', rate(300, 60000));
  function authenticated(req) { if (!accessToken) return true; const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('clarity_session='))?.slice('clarity_session='.length); if (!cookie) return false; const [expiry, signature] = cookie.split('.'); return /^\d+$/.test(expiry || '') && Number(expiry) > Date.now() && equal(signature || '', sign(expiry, secret)); }
  app.get('/api/health', (req, res) => res.json({ ok: true, version: VERSION }));
  app.get('/api/config', (req, res) => res.json({ authRequired: Boolean(accessToken), authenticated: authenticated(req), aiEnabled: aiEnabled(), model: AI_MODEL, demoWorkspace: !accessToken, catalog: repositoryConfig(), version: VERSION, settings: settingsNow() }));
  app.get('/api/changelog', (req, res) => res.json(readChangelog()));
  app.post('/api/auth', rate(10, 60000), (req, res) => { const token = z.string().max(500).parse(req.body.token); if (!accessToken || !equal(token, accessToken)) throw new AppError('Workspace passphrase is incorrect.', 401); const expiry = String(Date.now() + 12 * 3600000); res.cookie('clarity_session', `${expiry}.${sign(expiry, secret)}`, { httpOnly: true, secure: secureCookies, sameSite: 'strict', maxAge: 12 * 3600000, path: '/' }); res.json({ ok: true }); });
  app.post('/api/logout', (req, res) => { res.clearCookie('clarity_session', { path: '/' }); res.json({ ok: true }); });
  function lead(req, res, next) { if (!authenticated(req)) return res.status(401).json({ error: 'Sign in to the BA workspace.' }); next(); }
  function getEngagement(id) { const e = store.get(id); if (!e) throw new AppError('Engagement not found.', 404); return e; }
  function interview(token) { const hash = hashToken(z.string().length(43).parse(token)); const e = store.snapshot().engagements.find(e => e.stakeholders.some(p => p.tokenHash === hash)); if (!e) throw new AppError('This interview link is invalid or has been rotated. Ask your BA for a new link.', 404); const person = e.stakeholders.find(p => p.tokenHash === hash); if (person.inviteExpiresAt && Date.parse(person.inviteExpiresAt) <= Date.now()) throw new AppError('This interview link has expired. Ask your BA to issue a replacement; saved answers are retained.', 404); return { e, person }; }
  function interviewView(e, person) {
    return {
      engagement: {
        id: e.id, title: e.title, type: e.type, problem: e.problem, scopeIn: e.scopeIn, scopeOut: e.scopeOut, baseline: e.baseline,
        desiredChange: e.desiredChange, solutionSnapshot: e.solutionSnapshot, revision: e.revision, isExample: e.isExample,
        stakeholderCount: e.stakeholders.length, completedCount: e.stakeholders.filter(p => p.status === 'completed').length,
        parallel: e.interviewSettings?.parallelSittings !== false,
      },
      person: publicPerson(person), question: person.pendingQuestion || null,
      checks: e.validations.filter(v => v.targetId === person.id).map(v => ({ ...v, targetName: person.name, sourceName: e.stakeholders.find(p => p.id === v.sourceId)?.name })),
      attachments: (e.attachments || []).filter(a => a.stakeholderId === person.id),
      progress: { responses: person.responses.length, phases: new Set(person.responses.map(r => r.phaseIndex)).size, percent: person.status === 'completed' ? 100 : Math.min(96, new Set(person.responses.map(r => r.phaseIndex)).size * 10) },
      pacing: pacingFor(person), activity: effectiveActivity(person),
      timeBudget: person.timeBudget || null,
      askTimeBudget: e.interviewSettings?.askTimeBudget !== false,
      suggestedTimeBudget: e.interviewSettings?.timeBudgetMinutes || e.sessionMinutes || 30,
      reminders: (person.reminders || []).filter(r => !r.readAt).slice(-3),
    };
  }
  const detail = e => ({ ...publicEngagement(e), requirements: requirementsFor(e), gateReasons: gateReasons(e), reviewAreas: reviewAreas(e), requiredReviewAreas: requiredReviewAreas(e), changeManagement: changeManagementOf(e) });
  const update = async (req, id, fn) => { const { engagement, result } = await store.update(id, fn); return { engagement: detail(engagement), result }; };

  app.get('/api/engagements', lead, (req, res) => res.json({ engagements: store.snapshot().engagements.map(summary) }));
  app.post('/api/engagements', lead, asyncRoute(async (req, res) => {
    const state = store.snapshot(); const e = createEngagement(req.body, state.catalog, occupiedSlots(state.engagements), false, settingsNow());
    assert(e.stakeholders[0].schedule[0].startUtc >= new Date(Date.now() - 60000).toISOString(), 'Choose a current or future start date and availability window.');
    const invites = e.stakeholders.map(p => ({ stakeholderId: p.id, name: p.name, token: issueInvite(e, p) }));
    await store.create(e); res.status(201).json({ engagement: detail(e), invites });
  }));
  app.get('/api/engagements/:id', lead, (req, res) => res.json({ engagement: detail(getEngagement(req.params.id)) }));
  app.get('/api/activity', lead, (req, res) => res.json({ activity: store.snapshot().engagements.flatMap(e => e.audit.map(a => ({ ...a, title: e.title, engagementId: e.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30) }));
  app.get('/api/artifacts', lead, (req, res) => res.json({ artifacts: store.snapshot().engagements.flatMap(e => e.artifacts.map(a => ({ ...a, title: e.title, engagementId: e.id }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));

  // Workspace master setup: change management (Prosci-informed) is optional and off by default.
  app.get('/api/settings', lead, (req, res) => res.json({ settings: settingsNow() }));
  app.put('/api/settings', lead, asyncRoute(async (req, res) => {
    const parsed = workspaceSettingsInput.parse(req.body);
    const saved = await store.saveSettings(parsed);
    res.json({ settings: saved, appliedToNewEngagementsOnly: true });
  }));

  app.delete('/api/engagements/:id', lead, asyncRoute(async (req, res) => { await store.remove(req.params.id); res.json({ ok: true }); }));
  app.post('/api/engagements/:id/stakeholders', lead, asyncRoute(async (req, res) => {
    let invite = null;
    const result = await update(req, req.params.id, e => {
      version(e, req.body.expectedVersion);
      const state = store.snapshot();
      const created = addStakeholder(e, req.body, occupiedSlots(state.engagements, e.id), settingsNow());
      invite = { stakeholderId: created.person.id, name: created.person.name, token: created.token };
      return { stakeholderId: created.person.id, name: created.person.name, parallel: e.interviewSettings?.parallelSittings !== false };
    });
    res.status(201).json({ ...result, invite });
  }));
  app.put('/api/engagements/:id/change-management', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => setChangeManagement(e, req.body)))));
  app.get('/api/engagements/:id/progress', lead, (req, res) => res.json(engagementProgress(getEngagement(req.params.id), settingsNow())));
  app.post('/api/engagements/:id/reminders/auto', lead, asyncRoute(async (req, res) => {
    const settings = settingsNow();
    const due = sweepReminders(store.snapshot(), settings);
    if (!due.length) return res.json({ reminders: [], checked: true });
    await store.sweepReminders(draft => { draft.settings ||= settings; return sweepReminders(draft, settings); });
    res.json({ reminders: due, checked: true });
  }));
  app.post('/api/engagements/:id/reminders/:personId', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => { const p = e.stakeholders.find(p => p.id === req.params.personId); assert(p, 'Stakeholder not found.', 404); return sendReminder(e, p, req.body); }))));
  app.get('/api/notifications', lead, (req, res) => { const feed = notificationFeed(store.snapshot()); res.json({ notifications: feed, unread: feed.filter(n => !n.baReadAt).length }); });
  app.post('/api/notifications/read', lead, asyncRoute(async (req, res) => { const changed = await store.markNotificationsRead(draft => markNotificationsRead(draft, req.body || {})); res.json({ ok: true, changed }); }));
  app.post('/api/engagements/:id/invites/:personId', lead, asyncRoute(async (req, res) => { let token; const result = await update(req, req.params.id, e => { version(e, req.body.expectedVersion); const p = e.stakeholders.find(p => p.id === req.params.personId); assert(p, 'Stakeholder not found.', 404); token = issueInvite(e, p); }); res.json({ ...result, token }); }));
  app.post('/api/engagements/:id/reschedule/:personId', lead, asyncRoute(async (req, res) => {
    const result = await update(req, req.params.id, e => { version(e, req.body.expectedVersion); assert(e.status !== 'delivered', 'Handoff is locked.', 409); const p = e.stakeholders.find(p => p.id === req.params.personId); assert(p, 'Stakeholder not found.', 404); const index = z.number().int().min(0).max(2).parse(req.body.index); const old = p.schedule[index]; const partPhases = PART_PHASES[index]; assert(!partPhases.every(phase => p.responses.some(r => r.phaseIndex === phase)), 'A completed sitting is retained as history. Reschedule an unfinished sitting.', 409); const other = p.schedule.filter((_, i) => i !== index); const busy = [...occupiedSlots(store.snapshot().engagements, e.id), ...other]; const slot = findAvailableSlot(p, p.sessionMinutes, index ? new Date(p.schedule[index - 1].endUtc).getTime() : Date.now(), busy, p.schedule[index + 1]?.startUtc || null); p.schedule[index] = { ...old, startUtc: slot.startUtc, endUtc: slot.endUtc }; audit(e, 'Interview sitting rescheduled within availability', 'BA lead', { stakeholderId: p.id, sitting: index + 1, startUtc: slot.startUtc }); }); res.json(result);
  }));
  app.post('/api/engagements/:id/reopen/:personId', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => { const p = e.stakeholders.find(p => p.id === req.params.personId); assert(p, 'Stakeholder not found.', 404); reopenInterview(e, p, z.string().parse(req.body.question), req.body.expectedVersion); }))));
  app.post('/api/engagements/:id/verifications/:checkId/resolve', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => resolveVerification(e, req.params.checkId, resolutionInput.parse(req.body))))));
  app.post('/api/engagements/:id/reviews', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => saveReview(e, req.body)))));
  app.put('/api/engagements/:id/change-plan', lead, asyncRoute(async (req, res) => res.json(await update(req, req.params.id, e => saveChangePlan(e, req.body)))));
  app.get('/api/engagements/:id/artifacts/:artifactId', lead, (req, res) => { const e = getEngagement(req.params.id); const artifact = e.artifacts.find(a => a.id === req.params.artifactId); if (!artifact) throw new AppError('Handoff not found.', 404); res.type('text/markdown').set('Content-Disposition', `attachment; filename="${e.id}-requirements-v${artifact.version}.md"`).send(artifact.content); });
  app.post('/api/engagements/:id/generate', lead, rate(20, 60000), asyncRoute(async (req, res) => {
    const input = z.object({ expectedVersion: z.number().int().nonnegative(), attestation: z.literal(true), allowGuidedFallback: z.boolean().default(false) }).parse(req.body);
    let e = getEngagement(req.params.id); version(e, input.expectedVersion); assert(e.status !== 'delivered', 'A reviewed handoff already exists. Download the locked artifact.', 409);
    const reasons = gateReasons(e); assert(!reasons.length, `The delivery gate is locked: ${reasons.join('; ')}`, 409);
    let synthesis = null, warning = '';
    if (aiEnabled()) {
      try { synthesis = await synthesize(handoffContext(e), e.stakeholders.flatMap(p => p.responses.map(r => r.id))); }
      catch { assert(input.allowGuidedFallback, 'AI synthesis was unavailable or failed validation. No handoff was generated. Retry, or explicitly allow guided synthesis.', 503); warning = 'AI synthesis was unavailable or failed validation. The BA explicitly selected deterministic guided synthesis; original evidence and all review gates were retained.'; }
    }
    const result = await update(req, e.id, current => {
      version(current, input.expectedVersion); assert(current.status !== 'delivered', 'A handoff was already generated.', 409); assert(!gateReasons(current).length, 'The delivery gate changed. Review the updated evidence.', 409);
      const content = buildMarkdown(current, synthesis, { warning }); const artifact = { id: `MD-${current.id}`, version: current.revision + 1, createdAt: new Date().toISOString(), sha256: createHash('sha256').update(content).digest('hex'), engine: synthesis ? 'ai' : 'guided', content };
      current.artifacts.push(artifact); current.status = 'delivered'; audit(current, 'All delivery gates passed; reviewed Markdown handoff generated', 'BA lead', { artifactId: artifact.id, sha256: artifact.sha256, engine: artifact.engine }); return artifact;
    }); res.status(201).json(result);
  }));

  app.get('/api/catalog', lead, (req, res) => { const s = store.snapshot(); res.json({ solutions: s.catalog, meta: s.catalogMeta, repository: repositoryConfig() }); });
  app.post('/api/catalog', lead, asyncRoute(async (req, res) => { const parsed = catalogSchema.parse({ schemaVersion: 1, solutions: [req.body] }); const state = store.snapshot(); assert(!state.catalog.some(s => s.id === parsed.solutions[0].id), 'A solution with this ID already exists.', 409); const solutions = await store.catalog([...state.catalog, { ...parsed.solutions[0], origin: 'local' }]); res.status(201).json({ solutions }); }));
  app.post('/api/catalog/sync', lead, rate(10, 60000), asyncRoute(async (req, res) => { const config = repositoryConfig(); let incoming; try { incoming = await fetchCatalog(config); } catch (error) { throw new AppError(error instanceof z.ZodError ? 'Repository catalog failed schema validation. No records were changed.' : error.message, 502); } const solutions = await store.catalog(mergeCatalog(store.snapshot().catalog, incoming, config.repository)); res.json({ solutions, count: incoming.solutions.length }); }));

  app.get('/api/interviews/:token', asyncRoute(async (req, res) => { const { e, person } = interview(req.params.token); res.json(interviewView(e, person)); }));
  app.post('/api/interviews/:token/next', asyncRoute(async (req, res) => {
    let { e, person } = interview(req.params.token); const base = nextQuestion(e, person);
    if (!base) return res.json({ ...interviewView(e, person), completionReady: person.status !== 'completed' });
    const previous = person.responses.at(-1);
    if (previous && !base.reopened && PART_PHASES.findIndex(part => part.includes(previous.phaseIndex)) !== PART_PHASES.findIndex(part => part.includes(base.phaseIndex)) && !req.body.continueEarly && !person.pendingQuestion) return res.json({ ...interviewView(e, person), sittingComplete: true, nextPart: PART_PHASES.findIndex(part => part.includes(base.phaseIndex)), nextPartName: PART_NAMES[PART_PHASES.findIndex(part => part.includes(base.phaseIndex))] });
    if (!person.pendingQuestion) {
      let q = base, warning = null;
      if (aiEnabled() && !base.reopened) { try { q = await generateQuestion({ title: e.title, type: e.type, problem: e.problem, scopeIn: e.scopeIn, scopeOut: e.scopeOut, baseline: e.baseline, desiredChange: e.desiredChange, phase: base.phase, role: person.role, function: person.function, priorAnswers: person.responses.slice(-20).map(r => ({ key: r.questionKey, question: r.question, answer: r.text.slice(0, 1500), disposition: r.disposition })) }, base); } catch { warning = 'AI is temporarily unavailable. This question uses the guided framework; your answers are still saved.'; } }
      const state = await store.update(e.id, current => { const p = current.stakeholders.find(p => p.id === person.id); if (p.responses.length !== person.responses.length || p.status === 'completed' || current.status === 'delivered') return; p.pendingQuestion = q; audit(current, 'Interview question prepared', 'AI BA', { stakeholderId: p.id, questionId: q.id, engine: q.engine }); }); e = state.engagement; person = e.stakeholders.find(p => p.id === person.id);
      return res.json({ ...interviewView(e, person), warning });
    }
    res.json(interviewView(e, person));
  }));
  // Every answer is elicited into a detailed version: AI when configured, deterministic otherwise.
  async function elaborateForAnswer(e, person, question, input) {
    if (input.disposition !== 'answered' || !input.text.trim()) return null;
    const priority = input.priority || question.prioritySuggestion?.value;
    const fallback = elaborateFor(question, person, input.text, priority);
    if (!aiEnabled()) return fallback;
    try {
      return await elaborateAnswer({ question: question.question, hint: question.hint, phase: question.phase, role: person.role, function: person.function, answer: input.text, priority, engagement: { title: e.title, problem: e.problem, scopeIn: e.scopeIn, scopeOut: e.scopeOut } }, fallback);
    } catch { return fallback; }
  }
  app.post('/api/interviews/:token/answer', asyncRoute(async (req, res) => {
    const { e, person } = interview(req.params.token); const input = answerInput.parse(req.body);
    const question = person.pendingQuestion || nextQuestion(e, person);
    const elaboration = question ? await elaborateForAnswer(e, person, question, input) : null;
    const result = await update(null, e.id, current => { const p = current.stakeholders.find(p => p.id === person.id); return saveAnswer(current, p, input, p.name, elaboration); });
    res.json({ revision: result.engagement.revision, response: result.result, interview: interviewView(result.engagement, result.engagement.stakeholders.find(p => p.id === person.id)) });
  }));
  app.post('/api/interviews/:token/responses/:responseId/detail', asyncRoute(async (req, res) => {
    const { e, person } = interview(req.params.token);
    const result = await update(null, e.id, current => { const p = current.stakeholders.find(p => p.id === person.id); return saveDetail(current, p, req.params.responseId, req.body); });
    const fresh = store.get(e.id); // pendingQuestion is intentionally stripped from the lead-facing detail
    res.json({ revision: result.engagement.revision, response: result.result, interview: interviewView(fresh, fresh.stakeholders.find(p => p.id === person.id)) });
  }));
  // Presence, pause, and break state never bump the record revision.
  app.post('/api/interviews/:token/activity', asyncRoute(async (req, res) => {
    const { e, person } = interview(req.params.token);
    const result = await store.mutate(e.id, draft => { const p = draft.stakeholders.find(p => p.id === person.id); return recordActivity(draft, p, req.body); });
    const updated = result.engagement.stakeholders.find(p => p.id === person.id);
    res.json({ revision: result.engagement.revision, activity: result.result, pacing: pacingFor(updated), progress: engagementProgress(result.engagement, settingsNow()), reminders: (updated.reminders || []).filter(r => !r.readAt).slice(-3) });
  }));
  app.post('/api/interviews/:token/time-budget', asyncRoute(async (req, res) => {
    const { e, person } = interview(req.params.token);
    const result = await update(null, e.id, current => setTimeBudget(current, current.stakeholders.find(p => p.id === person.id), req.body));
    const fresh = store.get(e.id);
    res.json({ revision: result.engagement.revision, timeBudget: result.result, interview: interviewView(fresh, fresh.stakeholders.find(p => p.id === person.id)) });
  }));
  app.post('/api/interviews/:token/reminders/read', asyncRoute(async (req, res) => {
    const { e, person } = interview(req.params.token);
    await store.mutate(e.id, draft => { const p = draft.stakeholders.find(p => p.id === person.id); for (const reminder of p.reminders || []) reminder.readAt ||= new Date().toISOString(); });
    res.json({ ok: true });
  }));
  async function interviewId(token) { return interview(token).e.id; }
  app.post('/api/interviews/:token/complete', asyncRoute(async (req, res) => { const { e, person } = interview(req.params.token); const result = await update(null, e.id, current => completeInterview(current, current.stakeholders.find(p => p.id === person.id), req.body.expectedVersion, req.body.confirmed)); res.json({ revision: result.engagement.revision, completed: true }); }));
  app.post('/api/interviews/:token/verifications/:checkId', asyncRoute(async (req, res) => { const { e, person } = interview(req.params.token); const result = await update(null, e.id, current => answerVerification(current, current.stakeholders.find(p => p.id === person.id), req.params.checkId, verificationAnswerInput.parse(req.body))); res.json({ revision: result.engagement.revision, completed: true }); }));
  app.post('/api/interviews/:token/evidence', asyncRoute(async (req, res) => {
    const input = z.object({ filename: z.string().min(1).max(150).regex(/\.(md|txt|csv|json)$/i, 'Use a .md, .txt, .csv, or .json text file'), text: z.string().min(1).max(64000), expectedVersion: z.number().int().nonnegative() }).parse(req.body);
    const { e, person } = interview(req.params.token);
    const result = await update(null, e.id, current => { version(current, input.expectedVersion); const p = current.stakeholders.find(p => p.id === person.id); assert(p.status !== 'completed' && current.status !== 'delivered', 'Reopen the interview before adding evidence.', 409); current.attachments ||= []; assert(current.attachments.filter(a => a.stakeholderId === p.id).length < 10, 'Maximum 10 text evidence files per stakeholder.'); const item = { id: `DOC-${createHash('sha256').update(input.text).digest('hex').slice(0, 10).toUpperCase()}`, stakeholderId: p.id, name: input.filename.replace(/[\r\n]/g, ''), text: input.text.replace(/\u0000/g, ''), size: Buffer.byteLength(input.text), sha256: createHash('sha256').update(input.text).digest('hex'), uploadedBy: p.name, at: new Date().toISOString() }; current.attachments.push(item); audit(current, 'Text evidence attached', p.name, { attachmentId: item.id, sha256: item.sha256 }); syncStage(current); return item; }); res.status(201).json({ revision: result.engagement.revision, attachment: result.result });
  }));
  function sendCalendar(req, res, e, p) { res.type('text/calendar').set('Content-Disposition', `attachment; filename="${e.id}-${p.id.slice(0, 8)}.ics"`).send(calendarFor(e.title, p)); }
  app.get('/api/engagements/:id/calendar/:personId', lead, (req, res) => { const e = getEngagement(req.params.id); const p = e.stakeholders.find(p => p.id === req.params.personId); if (!p) throw new AppError('Stakeholder not found.', 404); sendCalendar(req, res, e, p); });
  app.get('/api/interviews/:token/calendar', (req, res) => { const { e, person } = interview(req.params.token); sendCalendar(req, res, e, person); });

  // Gentle, non-blocking reminders for stakeholders who are behind — never while paused or on a break.
  const sweepEvery = options.reminderSweepMs ?? 60000;
  if (sweepEvery > 0) {
    let running = false;
    const timer = setInterval(async () => {
      if (running) return; running = true;
      try { const settings = settingsNow(); if (sweepReminders(store.snapshot(), settings).length) await store.sweepReminders(draft => sweepReminders(draft, settings)); }
      catch (error) { console.error('Reminder sweep skipped:', error.message); }
      finally { running = false; }
    }, sweepEvery);
    timer.unref?.();
  }

  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  const dist = resolve('dist/client');
  if (existsSync(resolve(dist, 'index.html'))) { app.use(express.static(dist, { index: false })); app.get('/{*path}', (req, res) => res.sendFile(resolve(dist, 'index.html'))); }
  else app.get('/', (req, res) => res.type('text').send('Clarity API is running. Build the workspace with npm run build.'));
  app.use((error, req, res, next) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error instanceof AppError) return res.status(error.status).json({ error: error.message });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large. Use a smaller text evidence file.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON request.' });
    console.error('Request failed:', error.message); res.status(500).json({ error: 'The request could not be completed. Your last saved checkpoint is retained.' });
  });
  return app;
}
