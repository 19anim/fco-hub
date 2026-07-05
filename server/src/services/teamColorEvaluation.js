import crypto from 'node:crypto';

export function validateTeamColorPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
  if (!Array.isArray(payload.players) || payload.players.length === 0) {
    return { valid: false, error: 'players must be a non-empty array' };
  }
  for (const player of payload.players) {
    if (!player || typeof player !== 'object') return { valid: false, error: 'each player must be an object' };
    if (!player.slot_id || !player.uid) return { valid: false, error: 'each player requires slot_id and uid' };
  }
  return { valid: true, error: '' };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashTeamColorPayload(payload) {
  return crypto.createHash('sha256').update(stableStringify(payload || {})).digest('hex');
}

export function mapSlotsToPlayers(slotIds = [], payloadPlayers = []) {
  const bySlotId = new Map(payloadPlayers.map((p) => [p.slot_id, p]));
  return slotIds
    .map((slotId) => {
      const player = bySlotId.get(slotId);
      if (!player) return null;
      return { slotId, uid: player.uid || '', uic: player.uic || '' };
    })
    .filter(Boolean);
}

const LOCALE_KEYS = ['vn', 'en', 'th', 'kr', 'cn'];

function buildNames(item) {
  const names = {};
  for (const locale of LOCALE_KEYS) {
    names[locale] = String(item?.[`name_${locale}`] || '');
  }
  return names;
}

export function buildCatalogUpsertFromResponseItem(item, category, payloadPlayers) {
  const qualifiedSlots = Array.isArray(item?.qualified_slots) ? item.qualified_slots : [];
  const mapped = category === 'grade' ? [] : mapSlotsToPlayers(qualifiedSlots, payloadPlayers);
  const observedPlayerUics = [...new Set(mapped.map((p) => p.uic).filter(Boolean))];

  return {
    tcid: String(item?.tcid || ''),
    category,
    refType: String(item?.ref_type || ''),
    refId: String(item?.ref_id || ''),
    type: Number.isFinite(Number(item?.type)) ? Number(item.type) : null,
    names: buildNames(item),
    image: String(item?.image || ''),
    levels: [{
      level: Number(item?.level) || 0,
      required: Number(item?.required) || 0,
      rewards: item?.rewards && typeof item.rewards === 'object' ? item.rewards : {},
    }],
    observedPlayerUics,
  };
}

export function buildObservationFromResponseItem(item, category, payloadHash, payloadPlayers) {
  const matchedSlots = Array.isArray(item?.matched_slots) ? item.matched_slots : [];
  const qualifiedSlots = Array.isArray(item?.qualified_slots) ? item.qualified_slots : [];

  return {
    payloadHash,
    tcid: String(item?.tcid || ''),
    category,
    rawResponseItem: item,
    payloadPlayers: payloadPlayers.map((p) => ({ slotId: p.slot_id, uid: p.uid || '', uic: p.uic || '' })),
    matchedPlayers: mapSlotsToPlayers(matchedSlots, payloadPlayers),
    qualifiedPlayers: mapSlotsToPlayers(qualifiedSlots, payloadPlayers),
  };
}

export function iterateTeamColorResponseItems(response) {
  const groups = response?.groups || {};
  const categories = ['club', 'grade', 'relation'];
  const result = [];
  for (const category of categories) {
    const active = Array.isArray(groups[category]?.active) ? groups[category].active : [];
    for (const item of active) {
      result.push({ item, category });
    }
  }
  return result;
}

function mergeObservedPlayers(existingObservedPlayers, newUics) {
  const merged = [...(existingObservedPlayers || [])];
  const now = new Date();
  for (const uic of newUics) {
    const existing = merged.find((p) => p.uic === uic);
    if (existing) {
      existing.lastObservedAt = now;
    } else {
      merged.push({ uic, uids: [], firstObservedAt: now, lastObservedAt: now });
    }
  }
  return merged;
}

export async function persistTeamColorObservations(fifaAddictResponse, payload, payloadHash, { catalogModel, observationModel } = {}) {
  const payloadPlayers = Array.isArray(payload?.players) ? payload.players : [];
  const items = iterateTeamColorResponseItems(fifaAddictResponse);

  let catalogUpserts = 0;
  let observationsCreated = 0;

  for (const { item, category } of items) {
    const catalogUpdate = buildCatalogUpsertFromResponseItem(item, category, payloadPlayers);
    if (!catalogUpdate.tcid) continue;

    const existing = await catalogModel.findOne({ tcid: catalogUpdate.tcid }).lean();
    const observedPlayers = catalogUpdate.observedPlayerUics.length
      ? mergeObservedPlayers(existing?.observedPlayers, catalogUpdate.observedPlayerUics)
      : (existing?.observedPlayers || []);

    await catalogModel.findOneAndUpdate(
      { tcid: catalogUpdate.tcid },
      {
        $set: {
          category: catalogUpdate.category,
          refType: catalogUpdate.refType,
          refId: catalogUpdate.refId,
          type: catalogUpdate.type,
          names: catalogUpdate.names,
          image: catalogUpdate.image,
          observedPlayers,
          lastObservedAt: new Date(),
        },
        $push: { levels: catalogUpdate.levels[0] },
        $inc: { observationCount: 1 },
      },
      { upsert: true, new: true }
    );
    catalogUpserts += 1;

    const observation = buildObservationFromResponseItem(item, category, payloadHash, payloadPlayers);
    await observationModel.create(observation);
    observationsCreated += 1;
  }

  return { catalogUpserts, observationsCreated };
}
