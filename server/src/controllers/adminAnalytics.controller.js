import MonetizationEvent from '../models/MonetizationEvent.js';
import MonetizationItem from '../models/MonetizationItem.js';

export const getSummary = async (req, res) => {
  try {
    const { from, to, placement, type, platform } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);

    const eventFilter = {};
    if (Object.keys(dateFilter).length) eventFilter.createdAt = dateFilter;
    if (placement) eventFilter.placementKey = placement;

    const [impressions, clicks] = await Promise.all([
      MonetizationEvent.countDocuments({ ...eventFilter, eventType: 'impression' }),
      MonetizationEvent.countDocuments({ ...eventFilter, eventType: 'click' }),
    ]);

    const topItemsRaw = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click' } },
      { $group: { _id: '$itemId', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'monetizationitems',
        localField: '_id',
        foreignField: '_id',
        as: 'item',
      }},
      { $unwind: '$item' },
      { $project: { _id: 1, clicks: 1, title: '$item.title', type: '$item.type', platform: '$item.platform' } },
    ]);

    const itemFilter = {};
    if (type)     itemFilter.type     = type;
    if (platform) itemFilter.platform = platform;
    const topItems = Object.keys(itemFilter).length
      ? topItemsRaw.filter(i => Object.entries(itemFilter).every(([k, v]) => i[k] === v))
      : topItemsRaw;

    const topPlacements = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click' } },
      { $group: { _id: '$placementKey', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    const topEntities = await MonetizationEvent.aggregate([
      { $match: { ...eventFilter, eventType: 'click', entityType: { $exists: true, $ne: null } } },
      { $group: { _id: { entityType: '$entityType', entityId: '$entityId' }, clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    const dailyEvents = await MonetizationEvent.aggregate([
      { $match: eventFilter },
      { $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          eventType: '$eventType',
        },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.date': 1 } },
    ]);

    const dailyMap = {};
    for (const row of dailyEvents) {
      const d = row._id.date;
      if (!dailyMap[d]) dailyMap[d] = { date: d, impressions: 0, clicks: 0 };
      dailyMap[d][row._id.eventType === 'impression' ? 'impressions' : 'clicks'] = row.count;
    }
    const dailyCtr = Object.values(dailyMap).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? +((d.clicks / d.impressions) * 100).toFixed(2) : 0,
    }));

    const ctr = impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0;

    res.json({ success: true, data: { impressions, clicks, ctr, topItems, topPlacements, topEntities, dailyCtr } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Analytics error', error: err.message });
  }
};
