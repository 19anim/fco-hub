import axios from 'axios';
import { API_BASE } from '../config/api.js';
import { normalizeUpgradeLevel } from './upgradeHelpers.js';

function getSourceUid(player) {
  return String(player?._raw?.enrichment?.sourceUid || player?.spid || '');
}

function getUic(player) {
  return String(player?._raw?.enrichment?.uic || '');
}

export function buildTeamColorPayload(slots, bySlotId, { squadLevel = 1 } = {}) {
  const players = (slots || [])
    .map((slot) => {
      const player = bySlotId?.[slot.id];
      if (!player) return null;
      const previewRoles = [player.primaryPos, ...(Array.isArray(player.positions) ? player.positions : [])]
        .filter(Boolean)
        .filter((pos, index, arr) => arr.indexOf(pos) === index);

      return {
        slot_id: slot.id,
        uid: getSourceUid(player),
        uic: getUic(player),
        year: String(player.season || ''),
        reinforceLevel: normalizeUpgradeLevel(player.upgradeLevel),
        bonusLevel: 0,
        previewRoles,
        role: String(slot.pos || '').toUpperCase(),
      };
    })
    .filter(Boolean);

  if (!players.length) return null;

  return {
    players,
    selection: { group_one_tcid: '0', squad_level: squadLevel },
  };
}

export function getTeamColorPayloadHash(payload) {
  return JSON.stringify(payload || {});
}

export async function evaluateTeamColorLive(payload) {
  const res = await axios.post(`${API_BASE}/team-colors/evaluate`, payload);
  return res.data;
}
