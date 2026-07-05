import { fetchFifaAddictTeamColor } from '../services/fifaAddictSource.js';
import {
  validateTeamColorPayload,
  hashTeamColorPayload,
  persistTeamColorObservations,
} from '../services/teamColorEvaluation.js';
import TeamColorCatalog from '../models/TeamColorCatalog.js';
import TeamColorObservation from '../models/TeamColorObservation.js';

export async function evaluateTeamColor(req, res) {
  const validation = validateTeamColorPayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  let fifaAddictResponse;
  try {
    fifaAddictResponse = await fetchFifaAddictTeamColor(req.body);
  } catch (error) {
    return res.status(502).json({ success: false, message: 'FIFAAddict team color service unavailable', error: error.message });
  }

  res.json(fifaAddictResponse);

  const payloadHash = hashTeamColorPayload(req.body);
  persistTeamColorObservations(fifaAddictResponse, req.body, payloadHash, {
    catalogModel: TeamColorCatalog,
    observationModel: TeamColorObservation,
  }).catch((error) => {
    console.error('[TeamColor] Failed to persist catalog/observations:', error.message);
  });
}
