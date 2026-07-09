const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /secret|api[_-]?key|authorization|signature|cloudinary_url/i;

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function redactReport(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactReport(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactReport(item),
    ])
  );
}

export function createMigrationReport({ mode, startedAt = new Date().toISOString() }) {
  return {
    mode,
    startedAt,
    finishedAt: null,
    discovered: 0,
    classified: 0,
    byCategory: {},
    unresolved: [],
    planned: {
      uploads: [],
      skips: [],
      replacements: [],
    },
    counts: {
      uploaded: 0,
      skipped: 0,
      replaced: 0,
      failed: 0,
    },
    mappings: [],
    changed: {
      recordIds: [],
      activeVersions: [],
    },
    existingStatus: 'not-checked',
    failures: [],
  };
}

export function countDiscovered(report, discovered) {
  report.discovered = discovered.length;
  report.classified = discovered.filter((item) => item.category && item.key).length;
  report.byCategory = discovered.reduce((counts, item) => {
    if (item.category) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, {});
  report.unresolved = discovered
    .filter((item) => item.status === 'unresolved')
    .map((item) => ({ sourcePath: item.sourcePath, reason: item.reason }));
  return report;
}

export function finishMigrationReport(report, finishedAt = new Date().toISOString()) {
  report.finishedAt = finishedAt;
  return redactReport(report);
}

export function safeErrorMessage(error) {
  const message = error?.message ? String(error.message) : 'Unknown error';
  return message.replace(/(cloudinary:\/\/|https?:\/\/)[^\s]+/gi, '[REDACTED_URL]');
}

export function toJsonReport(report) {
  return `${JSON.stringify(redactReport(report), null, 2)}\n`;
}
