export async function syncScannedEvents(Event, scannedEvents, options = {}) {
  const now = options.now || new Date();
  const staleMissThreshold = options.staleMissThreshold || 2;
  const launchUrls = scannedEvents.map((event) => event.launchUrl);

  if (scannedEvents.length === 0) {
    return { total: 0, active: 0 };
  }

  const bulkOps = scannedEvents.map((event) => ({
    updateOne: {
      filter: { launchUrl: event.launchUrl },
      update: {
        $set: {
          ...event,
          lastSeenAt: now,
          missedScanCount: 0,
          hiddenFromEvents: false,
        },
      },
      upsert: true,
    },
  }));

  await Event.bulkWrite(bulkOps);

  const unseenQuery = {
    launchUrl: { $nin: launchUrls },
    hiddenFromEvents: { $ne: true },
    status: { $in: ['Active', 'Unknown'] },
  };

  await Event.updateMany(unseenQuery, {
    $inc: { missedScanCount: 1 },
    $set: { lastMissedAt: now },
  });

  await Event.updateMany(
    {
      launchUrl: { $nin: launchUrls },
      hiddenFromEvents: { $ne: true },
      missedScanCount: { $gte: staleMissThreshold },
    },
    {
      $set: { hiddenFromEvents: true },
    }
  );

  return {
    total: scannedEvents.length,
    active: scannedEvents.filter((event) => event.status === 'Active').length,
  };
}
