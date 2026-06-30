import MonetizationItem from '../models/MonetizationItem.js';
import { validateMonetizationItem } from '../services/monetizationValidator.js';
import { createAuditLog } from '../services/auditLog.js';
import { normalizeYoutubeContent } from '../services/youtubeContent.js';
import { hasSearchText, toSearchRegex } from '../services/searchText.js';

export function buildMonetizationListFilter({ status, type, platform, placementId, linkedPlayerId, search } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (platform) filter.platform = platform;
  if (placementId) filter.placementIds = placementId;
  if (linkedPlayerId) filter['linkedEntities.entityId'] = linkedPlayerId;
  if (hasSearchText(search)) filter.title = { $regex: toSearchRegex(search), $options: 'i' };
  return filter;
}

export const listItems = async (req, res) => {
  try {
    const { status, type, platform, placementId, linkedPlayerId, search, sort = 'newest', page = 1, limit = 20 } = req.query;

    const filter = buildMonetizationListFilter({ status, type, platform, placementId, linkedPlayerId, search });

    const sortMap = {
      newest: { createdAt: -1 },
      priority: { priority: -1, publishedAt: -1 },
      ctr: { 'tracking.clickCount': -1 },
    };
    const sortObj = sortMap[sort] || sortMap.newest;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MonetizationItem.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).populate('placementIds', 'key label'),
      MonetizationItem.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error listing items', error: err.message });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await MonetizationItem.findById(req.params.id).populate('placementIds', 'key label page');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching item', error: err.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const { valid, errors } = validateMonetizationItem(req.body);
    if (!valid) return res.status(400).json({ success: false, message: 'Validation failed', errors });

    if (req.body.type === 'youtube_video') {
      req.body.content = normalizeYoutubeContent(req.body.content);
    }

    const item = await MonetizationItem.create({ ...req.body, createdBy: actor.id, status: 'draft' });

    await createAuditLog({
      actorUserId: actor.id, actorEmail: actor.email,
      action: 'monetization.create', resourceType: 'MonetizationItem', resourceId: item._id,
      after: { title: item.title, type: item.type, status: item.status }, req,
    });

    res.status(201).json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating item', error: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'archived') return res.status(400).json({ success: false, message: 'Cannot edit archived item' });

    const before = { title: item.title, status: item.status };

    const EDITABLE = ['type', 'title', 'description', 'platform', 'placementIds', 'linkedEntities', 'priority', 'isFeatured', 'displayStrategy', 'startAt', 'endAt', 'content', 'affiliateLinks'];
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }

    if (item.type === 'youtube_video') {
      item.content = normalizeYoutubeContent(item.content);
    }

    const { valid, errors } = validateMonetizationItem(item.toObject());
    if (!valid) return res.status(400).json({ success: false, message: 'Validation failed', errors });

    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({
      actorUserId: actor.id, actorEmail: actor.email,
      action: 'monetization.update', resourceType: 'MonetizationItem', resourceId: item._id,
      before, after: { title: item.title, status: item.status }, req,
    });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating item', error: err.message });
  }
};

export const publishItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'archived') return res.status(400).json({ success: false, message: 'Cannot publish archived item' });

    const { valid, errors } = validateMonetizationItem(item.toObject());
    if (!valid) return res.status(400).json({ success: false, message: 'Item not ready to publish', errors });

    const before = { status: item.status };
    item.status = 'published';
    item.publishedAt = new Date();
    item.publishedBy = actor.id;
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.publish', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'published' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error publishing item', error: err.message });
  }
};

export const unpublishItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const before = { status: item.status };
    item.status = 'draft';
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.unpublish', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'draft' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error unpublishing item', error: err.message });
  }
};

export const archiveItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    const before = { status: item.status };
    item.status = 'archived';
    item.archivedAt = new Date();
    item.updatedBy = actor.id;
    await item.save();

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.archive', resourceType: 'MonetizationItem', resourceId: item._id, before, after: { status: 'archived' }, req });

    res.json({ success: true, data: { item } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error archiving item', error: err.message });
  }
};

export const duplicateItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const source = await MonetizationItem.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ success: false, message: 'Item not found' });

    delete source._id;
    delete source.__v;
    delete source.createdAt;
    delete source.updatedAt;
    source.title = `${source.title} (copy)`;
    source.status = 'draft';
    source.publishedAt = undefined;
    source.publishedBy = undefined;
    source.archivedAt = undefined;
    source.tracking = { impressionCount: 0, clickCount: 0 };
    source.createdBy = actor.id;

    const newItem = await MonetizationItem.create(source);

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.duplicate', resourceType: 'MonetizationItem', resourceId: newItem._id, after: { title: newItem.title }, req });

    res.status(201).json({ success: true, data: { item: newItem } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error duplicating item', error: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const actor = req.session.adminUser;
    const item = await MonetizationItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (item.status === 'published') return res.status(400).json({ success: false, message: 'Unpublish before deleting' });

    await MonetizationItem.findByIdAndDelete(req.params.id);

    await createAuditLog({ actorUserId: actor.id, actorEmail: actor.email, action: 'monetization.delete', resourceType: 'MonetizationItem', resourceId: req.params.id, before: { title: item.title, status: item.status }, req });

    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting item', error: err.message });
  }
};
