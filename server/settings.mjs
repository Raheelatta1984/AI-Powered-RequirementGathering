// Workspace-level master setup. Change management (Prosci-informed) is optional and off by
// default; every related process can be switched on individually when an engagement needs it.
export const ADKAR_KEYS = ['awareness', 'desire', 'knowledge', 'ability', 'reinforcement'];
export const PROSCI_PHASES = ['prepare', 'manage', 'sustain'];
export const PROSCI_PHASE_LABELS = { prepare: 'Prepare Approach', manage: 'Manage Change', sustain: 'Sustain Outcomes' };

export const DEFAULT_CHANGE_MANAGEMENT = Object.freeze({
  enabled: false,
  adkar: Object.freeze(Object.fromEntries(ADKAR_KEYS.map(key => [key, true]))),
  phases: Object.freeze(Object.fromEntries(PROSCI_PHASES.map(key => [key, true]))),
  changeReview: false,
});
export const DEFAULT_REMINDERS = Object.freeze({ auto: true, idleMinutes: 20, maxPerDay: 3, cooldownMinutes: 120 });
export const DEFAULT_INTERVIEW_SETTINGS = Object.freeze({ askTimeBudget: true, timeBudgetMinutes: 30, parallelSittings: true });

export function defaultChangeManagement() {
  return { enabled: false, adkar: { ...DEFAULT_CHANGE_MANAGEMENT.adkar }, phases: { ...DEFAULT_CHANGE_MANAGEMENT.phases }, changeReview: false };
}
export function defaultWorkspaceSettings() {
  return { changeManagement: defaultChangeManagement(), reminders: { ...DEFAULT_REMINDERS }, interview: { ...DEFAULT_INTERVIEW_SETTINGS } };
}
export function mergeChangeManagement(current, patch) {
  const base = { ...defaultChangeManagement(), ...(current || {}) };
  return {
    ...base,
    adkar: { ...DEFAULT_CHANGE_MANAGEMENT.adkar, ...(base.adkar || {}), ...(patch?.adkar || {}) },
    phases: { ...DEFAULT_CHANGE_MANAGEMENT.phases, ...(base.phases || {}), ...(patch?.phases || {}) },
    enabled: patch?.enabled ?? base.enabled,
    changeReview: patch?.changeReview ?? base.changeReview,
  };
}
export function changeManagementOf(engagement) {
  return mergeChangeManagement(engagement?.changeManagement, null);
}
// Legacy records (created before this option existed) keep the gates they were reviewed against.
export function legacyChangeManagement() {
  return { enabled: true, adkar: Object.fromEntries(ADKAR_KEYS.map(key => [key, true])), phases: Object.fromEntries(PROSCI_PHASES.map(key => [key, true])), changeReview: true };
}
