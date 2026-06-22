import MonetizationItem from '../models/MonetizationItem.js';
import MonetizationPlacement from '../models/MonetizationPlacement.js';
import MonetizationEvent from '../models/MonetizationEvent.js';
import { isSafeRedirectUrl, sanitizeAffiliateLinks } from '../services/urlSafety.js';

const PUBLIC_ITEM_FIELDS = 'type title description platform priority isFeatured displayStrategy content affiliateLinks startAt endAt';

function isActive(item) {
  const now = new Date();
  if (item.startAt && item.startAt > now) return false;
  if (item.endAt   && item.endAt   < now) return false;
  return true;
}

function sanitizeItem(item, entityType, entityId) {
  const obj = { ...item };

  delete obj.status;
  delete obj.displayStrategy;
  delete obj.placementIds;
  delete obj.createdBy;
  delete obj.updatedBy;
  delete obj.publishedBy;
  delete obj.publishedAt;
  delete obj.archivedAt;
  delete obj.tracking;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.__v;

  if (obj.type === 'ad_slot' && obj.content?.providerConfig) {
    const { provider, slotId, size } = obj.content.providerConfig;
    obj.content = { ...obj.content, providerConfig: { provider, slotId, size } };
  }

  if (Array.isArray(obj.affiliateLinks)) {
    obj.affiliateLinks = sanitizeAffiliateLinks(obj.affiliateLinks);
  }

  if (entityType && entityId) {
    const link = item.linkedEntities?.find(
      e => e.entityType === entityType && e.entityId === String(entityId)
    );
    if (link) {
      obj._entityOverride = {
        relationType:     link.relationType,
        featuredOverride: link.featuredOverride,
        priorityOverride: link.priorityOverride,
      };
    }
  }

  delete obj.linkedEntities;
  return obj;
}

function sortItems(items, entityType, entityId) {
  return [...items].sort((a, b) => {
    const linkA = a.linkedEntities?.find(e => e.entityType === entityType && e.entityId === String(entityId));
    const linkB = b.linkedEntities?.find(e => e.entityType === entityType && e.entityId === String(entityId));

    const featuredA = linkA?.featuredOverride ?? a.isFeatured ?? false;
    const featuredB = linkB?.featuredOverride ?? b.isFeatured ?? false;
    if (featuredA !== featuredB) return featuredA ? -1 : 1;

    const prioA = linkA?.priorityOverride ?? a.priority ?? 0;
    const prioB = linkB?.priorityOverride ?? b.priority ?? 0;
    return prioB - prioA;
  });
}

export const getFeed = async (req, res) => {
  try {
    const { placement, entityType, entityId, type, limit } = req.query;

    if (!placement) {
      return res.status(400).json({ success: false, message: 'placement param required' });
    }

    const placementDoc = await MonetizationPlacement.findOne({ key: placement, enabled: true });
    if (!placementDoc) {
      return res.json({ success: true, data: { items: [] } });
    }

    const maxLimit = Math.min(Number(limit) || placementDoc.defaultLimit, 50);

    const filter = {
      status: 'published',
      placementIds: placementDoc._id,
    };
    if (type) filter.type = type;

    if (entityType && entityId) {
      filter.linkedEntities = { $elemMatch: { entityType, entityId: String(entityId) } };
    }

    const items = await MonetizationItem
      .find(filter)
      .select(PUBLIC_ITEM_FIELDS + ' publishedAt linkedEntities')
      .lean();

    const active    = items.filter(isActive);
    const sorted    = sortItems(active, entityType, entityId);
    const limited   = sorted.slice(0, maxLimit);
    const sanitized = limited.map(item => sanitizeItem(item, entityType, entityId));

    res.json({ success: true, data: { items: sanitized } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Feed error', error: err.message });
  }
};

export const recordEvent = async (req, res) => {
  try {
    const { itemId, placementKey, eventType, entityType, entityId, sessionId } = req.body;

    if (!itemId || !placementKey || !eventType) {
      return res.status(400).json({ success: false, message: 'itemId, placementKey, eventType required' });
    }

    if (eventType === 'impression' && sessionId) {
      const already = await MonetizationEvent.exists({ itemId, eventType: 'impression', sessionId });
      if (already) {
        return res.json({ success: true, message: 'Duplicate impression ignored' });
      }
    }

    await MonetizationEvent.create({
      itemId, placementKey, eventType, entityType, entityId, sessionId,
      userAgent: req.headers['user-agent'],
      referrer:  req.headers['referer'],
    });

    if (eventType === 'impression') {
      await MonetizationItem.findByIdAndUpdate(itemId, {
        $inc: { 'tracking.impressionCount': 1 },
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Event error', error: err.message });
  }
};

export const recordClick = async (req, res) => {
  try {
    const item = await MonetizationItem.findById(req.params.itemId)
      .select('status content type affiliateLinks');

    if (!item || item.status !== 'published') {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    await MonetizationEvent.create({
      itemId:       item._id,
      placementKey: req.query.placement || 'unknown',
      eventType:    'click',
      entityType:   req.query.entityType,
      entityId:     req.query.entityId,
      sessionId:    req.query.sessionId,
      userAgent:    req.headers['user-agent'],
    });

    await MonetizationItem.findByIdAndUpdate(item._id, {
      $inc: { 'tracking.clickCount': 1 },
      $set: { 'tracking.lastClickedAt': new Date() },
    });

    const linkIndex = Number(req.query.linkIndex ?? -1);
    const targetUrl = linkIndex >= 0
      ? item.affiliateLinks?.[linkIndex]?.url
      : item.content?.targetUrl || item.affiliateLinks?.[0]?.url;
    if (!targetUrl) return res.status(400).json({ success: false, message: 'No target URL' });
    if (!isSafeRedirectUrl(targetUrl)) return res.status(400).json({ success: false, message: 'Unsafe target URL' });

    res.redirect(302, targetUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Click tracking error', error: err.message });
  }
};
