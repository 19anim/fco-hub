// Pure helpers for the Events view. No React, no DOM side effects except openSequentially.

const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight today, local time.
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Whole days from today until the given date (can be negative). null if no date.
export function daysUntil(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - startOfToday().getTime()) / DAY_MS);
}

// Keep events that are still valid TODAY, regardless of the stale `status` column.
// Valid = has a future/today endDate, OR is Unknown (no public end date).
export function filterValidEvents(events) {
  const today = startOfToday().getTime();
  return (events || []).filter((e) => {
    if (e.endDate) {
      const end = new Date(e.endDate);
      if (Number.isNaN(end.getTime())) return e.status === 'Unknown';
      end.setHours(0, 0, 0, 0);
      return end.getTime() >= today;
    }
    return e.status === 'Unknown';
  });
}

// Split valid events into three ordered buckets for display.
// expiring: endDate within 3 days. ongoing: later endDate. unknown: no endDate.
export function groupEvents(events) {
  const expiring = [];
  const ongoing = [];
  const unknown = [];
  for (const e of events) {
    const d = daysUntil(e.endDate);
    if (d === null) unknown.push(e);
    else if (d <= 3) expiring.push(e);
    else ongoing.push(e);
  }
  const byEnd = (a, b) => new Date(a.endDate) - new Date(b.endDate);
  expiring.sort(byEnd);
  ongoing.sort(byEnd);
  return { expiring, ongoing, unknown };
}

// Open all URLs in new tabs. Requires popup permission to be granted by the user.
// Chrome allows the first tab per gesture but silently blocks the rest — detect via
// the second window.open return value and call onBlocked() if popups aren't fully allowed.
export function openSequentially(urls, { onBlocked, onDone } = {}) {
  if (!urls.length) { onDone?.(); return () => {}; }

  for (let i = 0; i < urls.length; i++) {
    const win = window.open(urls[i], '_blank', 'noopener noreferrer');
    if (win === null) { onBlocked?.(); return () => {}; }
  }

  onDone?.();
  return () => {};
}
