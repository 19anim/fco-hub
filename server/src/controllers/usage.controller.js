import { getUsageDashboard, lookupOuid, syncMatchUsage } from '../services/nexonMatchUsage.js';

function handleNexonError(error, res) {
  if (error.code === 'MISSING_NEXON_API_KEY') {
    return res.status(400).json({
      success: false,
      message: 'Missing NEXON_API_KEY. Add it to server/.env to enable Nexon match usage.',
      setup: {
        docs: 'https://openapi.nexon.com/guide/prepare-in-advance/',
        env: 'NEXON_API_KEY=your_key_here',
        header: 'x-nxopen-api-key',
      },
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Nexon usage request failed',
    error: error.message,
  });
}

export const getMetaUsage = async (req, res) => {
  try {
    const data = await getUsageDashboard({
      matchtype: req.query.matchtype,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (error) {
    handleNexonError(error, res);
  }
};

export const syncMetaUsage = async (req, res) => {
  try {
    const data = await syncMatchUsage({
      nickname: req.body?.nickname,
      ouid: req.body?.ouid,
      matchtype: req.body?.matchtype,
      limit: req.body?.limit,
    });
    res.json({ success: true, message: 'Nexon match usage synced', data });
  } catch (error) {
    handleNexonError(error, res);
  }
};

export const lookupNexonOuid = async (req, res) => {
  try {
    const data = await lookupOuid(req.query.nickname);
    res.json({ success: true, data });
  } catch (error) {
    handleNexonError(error, res);
  }
};
