import SquadShare from '../models/SquadShare.js';

function sanitizeVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const sanitized = [];
  for (const variant of variants) {
    const key = String(variant?.key || '').trim();
    const formationId = String(variant?.formationId || '').trim();
    if (!key || !formationId) return null;
    sanitized.push({
      key,
      conditionLabel: String(variant?.conditionLabel || ''),
      conditionType: ['default', 'losing', 'drawing', 'leading'].includes(variant?.conditionType)
        ? variant.conditionType
        : 'default',
      conditionThreshold: Number.isFinite(Number(variant?.conditionThreshold)) ? Number(variant.conditionThreshold) : null,
      formationId,
      bySlotId: variant?.bySlotId && typeof variant.bySlotId === 'object' ? variant.bySlotId : {},
      customSlots: Array.isArray(variant?.customSlots) ? variant.customSlots : null,
    });
  }
  return sanitized;
}

function sanitizeSquadSharePayload(body = {}) {
  const { label, mode, managerName, tacticName, description, pitchColor, variants } = body;
  const sanitizedVariants = sanitizeVariants(variants);
  if (!sanitizedVariants) return null;

  return {
    label: label || '',
    mode: mode === 'glxh' ? 'glxh' : 'da_tay',
    managerName: managerName || '',
    tacticName: tacticName || '',
    description: String(description || '').slice(0, 2000),
    pitchColor: /^#[0-9a-fA-F]{6}$/.test(pitchColor || '') ? pitchColor : '',
    variants: sanitizedVariants,
  };
}

export const createSquadShare = async (req, res) => {
  try {
    const payload = sanitizeSquadSharePayload(req.body);
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid squad variant is required',
      });
    }

    const squadShare = await SquadShare.create(payload);

    res.status(201).json({
      success: true,
      data: squadShare,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating squad share',
      error: error.message,
    });
  }
};

export const listSquadShares = async (req, res) => {
  try {
    const { mode } = req.query || {};
    const filter = {};
    if (mode === 'da_tay' || mode === 'glxh') filter.mode = mode;

    const squadShares = await SquadShare.find(filter)
      .select('label mode managerName tacticName description pitchColor variants createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: squadShares,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing squad shares',
      error: error.message,
    });
  }
};

export const getSquadShareById = async (req, res) => {
  try {
    const squadShare = await SquadShare.findById(req.params.id);

    if (!squadShare) {
      return res.status(404).json({
        success: false,
        message: 'Squad share not found',
      });
    }

    res.json({
      success: true,
      data: squadShare,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching squad share',
      error: error.message,
    });
  }
};

export const updateSquadShare = async (req, res) => {
  try {
    const payload = sanitizeSquadSharePayload(req.body);
    if (!payload) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid squad variant is required',
      });
    }

    const squadShare = await SquadShare.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!squadShare) {
      return res.status(404).json({
        success: false,
        message: 'Squad share not found',
      });
    }

    res.json({
      success: true,
      data: squadShare,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating squad share',
      error: error.message,
    });
  }
};

export const deleteSquadShare = async (req, res) => {
  try {
    const squadShare = await SquadShare.findByIdAndDelete(req.params.id);

    if (!squadShare) {
      return res.status(404).json({
        success: false,
        message: 'Squad share not found',
      });
    }

    res.json({
      success: true,
      message: 'Squad share deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting squad share',
      error: error.message,
    });
  }
};
