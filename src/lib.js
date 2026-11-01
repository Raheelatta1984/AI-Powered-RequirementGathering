import { useEffect, useState } from 'react';
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}
export function useRoute() { const read = () => window.location.hash.replace(/^#\/?/, '') || 'overview'; const [route, setRoute] = useState(read); useEffect(() => { const fn = () => { setRoute(read()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', fn); return () => window.removeEventListener('hashchange', fn); }, []); return route; }
export const navigate = route => { window.location.hash = `/${route}`; };
export const cx = (...values) => values.filter(Boolean).join(' ');
export const plainText = value => String(value || '').replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s*/gm, '').trim();
export function formatDate(value, options = {}) { if (!value) return 'Not scheduled'; return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...options }).format(new Date(value)); }
export function formatDay(value, timezone) { return new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone }).format(new Date(value)); }
export function formatTime(value, timezone) { return new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(value)); }
export async function copyText(text) { if (navigator.clipboard) return navigator.clipboard.writeText(text); const el = document.createElement('textarea'); el.value = text; el.style.position = 'fixed'; el.style.opacity = '0'; document.body.appendChild(el); el.select(); const ok = document.execCommand('copy'); el.remove(); if (!ok) throw new Error('Copy is unavailable. Select and copy the text manually.'); }
export async function downloadFile(path, filename) { const response = await fetch(`/api${path}`, { credentials: 'same-origin' }); if (!response.ok) throw new Error('Download failed. Please sign in and retry.'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export const inviteUrl = token => `${window.location.origin}/#/interview/${token}`;
export const initials = name => name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
export const PHASE_NAMES = ['Business context', 'Problem & evidence', 'People & ownership', 'Outcomes & measures', 'Scope & boundaries', 'Functional needs', 'Quality & security', 'Technical constraints', 'Risks & safeguards', 'Priority & confirmation'];
export const STATUS = { interviewing: ['Interviews in progress', 'blue'], validating: ['Cross-functional validation', 'amber'], review: ['Ready for BA review', 'purple'], delivered: ['Handoff ready', 'green'] };
