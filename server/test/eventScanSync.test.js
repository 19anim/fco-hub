import test from 'node:test';
import assert from 'node:assert/strict';
import { syncScannedEvents } from '../src/services/eventScanSync.js';

function createEventModel() {
  const calls = [];
  return {
    calls,
    async bulkWrite(ops) {
      calls.push(['bulkWrite', ops]);
    },
    async updateMany(query, update) {
      calls.push(['updateMany', query, update]);
      return { modifiedCount: 0 };
    },
  };
}

const scannedEvents = [
  {
    title: 'Active event',
    sourceUrl: 'https://fconline.garena.vn/a/',
    launchUrl: 'https://event.fconline.garena.vn/a/',
    dateLabel: '01.07.2026 - 05.07.2026',
    status: 'Active',
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-05T00:00:00.000Z'),
    isSubdomain: true,
    isNewsPage: false,
  },
];

test('scan sync marks seen events fresh and visible', async () => {
  const Event = createEventModel();
  const now = new Date('2026-07-01T12:00:00.000Z');

  const result = await syncScannedEvents(Event, scannedEvents, { now });

  assert.equal(result.total, 1);
  assert.equal(result.active, 1);
  const bulkWrite = Event.calls.find(([name]) => name === 'bulkWrite');
  assert.equal(bulkWrite[1][0].updateOne.filter.launchUrl, 'https://event.fconline.garena.vn/a/');
  assert.equal(bulkWrite[1][0].updateOne.update.$set.lastSeenAt, now);
  assert.equal(bulkWrite[1][0].updateOne.update.$set.missedScanCount, 0);
  assert.equal(bulkWrite[1][0].updateOne.update.$set.hiddenFromEvents, false);
});

test('scan sync increments missed scans and hides records missed twice', async () => {
  const Event = createEventModel();
  const now = new Date('2026-07-01T12:00:00.000Z');

  await syncScannedEvents(Event, scannedEvents, { now, staleMissThreshold: 2 });

  assert.deepEqual(Event.calls[1], [
    'updateMany',
    {
      launchUrl: { $nin: ['https://event.fconline.garena.vn/a/'] },
      hiddenFromEvents: { $ne: true },
      status: { $in: ['Active', 'Unknown'] },
    },
    {
      $inc: { missedScanCount: 1 },
      $set: { lastMissedAt: now },
    },
  ]);
  assert.deepEqual(Event.calls[2], [
    'updateMany',
    {
      launchUrl: { $nin: ['https://event.fconline.garena.vn/a/'] },
      hiddenFromEvents: { $ne: true },
      missedScanCount: { $gte: 2 },
    },
    {
      $set: { hiddenFromEvents: true },
    },
  ]);
});

test('scan sync does not mark all records missed when crawl returns no events', async () => {
  const Event = createEventModel();

  const result = await syncScannedEvents(Event, [], { now: new Date('2026-07-01T12:00:00.000Z') });

  assert.equal(result.total, 0);
  assert.deepEqual(Event.calls, []);
});
