import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventsQuery } from '../src/controllers/event.controller.js';

test('events query hides stale scan results by default', () => {
  assert.deepEqual(buildEventsQuery({}), {
    hiddenFromEvents: { $ne: true },
  });
});

test('events query combines visibility with status and type filters', () => {
  assert.deepEqual(buildEventsQuery({ status: 'Active', type: 'events' }), {
    hiddenFromEvents: { $ne: true },
    status: 'Active',
    isSubdomain: true,
  });

  assert.deepEqual(buildEventsQuery({ type: 'news' }), {
    hiddenFromEvents: { $ne: true },
    isNewsPage: true,
  });
});
