import Event from '../models/Event.js';
import FCOCrawler from '../services/fcoCrawler.js';

const crawler = new FCOCrawler();

// Get all events
export const getEvents = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type === 'events') {
      query.isSubdomain = true;
    } else if (type === 'news') {
      query.isNewsPage = true;
    }
    
    const events = await Event.find(query).sort({ status: 1, endDate: -1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message,
    });
  }
};

// Scan and update events (manual trigger)
export const scanEvents = async (req, res) => {
  try {
    console.log('Starting event scan...');
    
    const scannedEvents = await crawler.getEvents();
    
    // Update database
    const bulkOps = scannedEvents.map((event) => ({
      updateOne: {
        filter: { launchUrl: event.launchUrl },
        update: { $set: event },
        upsert: true,
      },
    }));
    
    if (bulkOps.length > 0) {
      await Event.bulkWrite(bulkOps);
    }
    
    // Mark old events as expired
    const now = new Date();
    await Event.updateMany(
      {
        endDate: { $lt: now },
        status: 'Active',
      },
      {
        $set: { status: 'Expired' },
      }
    );
    
    const activeCount = scannedEvents.filter((e) => e.status === 'Active').length;
    
    console.log(`Scan completed: ${scannedEvents.length} total, ${activeCount} active`);
    
    res.json({
      success: true,
      message: 'Events scan completed',
      data: {
        total: scannedEvents.length,
        active: activeCount,
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error scanning events',
      error: error.message,
    });
  }
};

// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }
    
    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: error.message,
    });
  }
};