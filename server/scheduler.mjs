// Convert an IANA local wall time to UTC without a dependency or host-timezone assumptions.
// Nonexistent spring-forward times are rejected; ambiguous fall-back times use the earlier instant.
export function zonedTimeToUtc(day, time, timeZone) {
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, date, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let utc = wall;
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(utc)).map(p => [p.type, p.value]));
    const rendered = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    const next = wall - (rendered - utc);
    if (next === utc) break;
    utc = next;
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(utc)).map(p => [p.type, p.value]));
  if (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) !== wall) throw new Error('This local time does not exist. Choose another availability window.');
  return new Date(utc);
}
export function dayInZone(date, timeZone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function scheduleStakeholder(person, startDate, minutes, occupied = [], now = new Date(), count = 3) {
  const slots = [];
  const busy = [...occupied];
  const base = new Date(`${startDate}T00:00:00Z`);
  for (let offset = 0; offset < 90 && slots.length < count; offset++) {
    const date = new Date(base.getTime() + offset * 86400000);
    const day = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    for (const window of person.availability.filter(a => a.day === weekday).sort((a, b) => a.start.localeCompare(b.start))) {
      let cursor = zonedTimeToUtc(day, window.start, person.timezone);
      const end = zonedTimeToUtc(day, window.end, person.timezone);
      while (cursor.getTime() + minutes * 60000 <= end.getTime() && slots.length < count) {
        if (cursor < now) {
          const elapsed = Math.max(0, (now.getTime() - zonedTimeToUtc(day, window.start, person.timezone).getTime()) / 60000);
          const steps = Math.ceil(elapsed / minutes);
          cursor = new Date(zonedTimeToUtc(day, window.start, person.timezone).getTime() + steps * minutes * 60000);
        }
        const finish = new Date(cursor.getTime() + minutes * 60000);
        if (cursor < now || finish > end) break;
        // The lead cannot attend two interviews at once, including across engagements.
        const clash = busy.find(b => cursor < new Date(b.endUtc) && finish > new Date(b.startUtc));
        if (clash) { cursor = new Date(clash.endUtc); if (finish > end) break; continue; }
        // Keep distinct sittings on distinct days, even when someone offers a full day.
        if (slots.some(s => dayInZone(new Date(s.startUtc), person.timezone) === dayInZone(cursor, person.timezone))) break;
        const slot = { id: `sitting-${slots.length + 1}`, index: slots.length, startUtc: cursor.toISOString(), endUtc: finish.toISOString(), timezone: person.timezone, minutes };
        slots.push(slot); busy.push(slot); cursor = finish;
      }
    }
  }
  if (slots.length !== count) throw new Error(`Could not find ${count} sitting(s) for ${person.name} within 90 days. Add availability or reduce sitting length.`);
  return slots;
}
export function scheduleRoster(roster, startDate, minutes, occupied = []) {
  const busy = [...occupied];
  return roster.map(person => { const schedule = scheduleStakeholder(person, startDate, minutes, busy); busy.push(...schedule); return { ...person, schedule }; });
}
export function findAvailableSlot(person, minutes, after, occupied = [], before = null, now = new Date()) {
  const start = dayInZone(new Date(Math.max(after, now.getTime())), person.timezone);
  const busy = before ? [...occupied, { startUtc: before, endUtc: new Date(new Date(before).getTime() + 365 * 86400000).toISOString() }] : occupied;
  return scheduleStakeholder(person, start, minutes, busy, now, 1)[0];
}
const escapeIcs = value => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const utcStamp = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
// RFC 5545 line folding (UTF-8 octets, never split a code point).
function fold(line) {
  const encoder = new TextEncoder(); let out = '', size = 0;
  for (const char of line) { const bytes = encoder.encode(char).length; if (size + bytes > 74) { out += '\r\n '; size = 1; } out += char; size += bytes; }
  return out;
}
export function calendarFor(title, person, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Clarity//AI BA Workspace//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const slot of person.schedule) lines.push('BEGIN:VEVENT', `UID:${person.id}-${slot.id}@clarity.local`, `DTSTAMP:${utcStamp(now)}`, `DTSTART:${utcStamp(slot.startUtc)}`, `DTEND:${utcStamp(slot.endUtc)}`, fold(`SUMMARY:${escapeIcs(`${title} · ${person.name} · sitting ${slot.index + 1}/3`)}`), fold(`DESCRIPTION:${escapeIcs('Private requirements interview. Use the invite link supplied by your BA. Times are shown in your calendar timezone. This import does not send email or reserve an external calendar.')}`), 'STATUS:TENTATIVE', 'TRANSP:OPAQUE', 'END:VEVENT');
  lines.push('END:VCALENDAR'); return lines.join('\r\n') + '\r\n';
}
