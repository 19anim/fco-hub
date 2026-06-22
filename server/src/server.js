import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import connectDB from './config/db.js';
import eventRoutes from './routes/event.routes.js';
import enrichmentRoutes from './routes/enrichment.routes.js';
import playerRoutes from './routes/player.routes.js';
import usageRoutes from './routes/usage.routes.js';
import adminAuthRoutes from './routes/adminAuth.routes.js';
import adminUsersRoutes from './routes/adminUsers.routes.js';
import adminMonetizationRoutes from './routes/adminMonetization.routes.js';
import adminPlacementsRoutes from './routes/adminPlacements.routes.js';
import adminSearchRoutes from './routes/adminSearch.routes.js';
import FCOCrawler from './services/fcoCrawler.js';
import { syncFifaAddict } from './services/fifaAddictSource.js';
import { syncNexonPlayers } from './services/nexonMetadata.js';
import { bootstrapOwner } from './services/adminBootstrap.js';
import { seedPlacements } from './services/seedPlacements.js';
import Event from './models/Event.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();
bootstrapOwner();
seedPlacements();

// Middleware
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://glistening-longma-8532e9.netlify.app',
  'https://fco-hub.netlify.app',
  process.env.CLIENT_URL,
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

// Routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/monetization', adminMonetizationRoutes);
app.use('/api/admin/placements', adminPlacementsRoutes);
app.use('/api/admin/search', adminSearchRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/usage', usageRoutes);

// Health check routes
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FCO Hub API is running',
    timestamp: new Date().toISOString(),
  });
});

// Auto-scan events every 30 minutes
const crawler = new FCOCrawler();
cron.schedule('*/30 * * * *', async () => {
  try {
    console.log('[CRON] Starting automatic event scan...');
    
    const scannedEvents = await crawler.getEvents();
    
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
    
    // Mark expired events
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
    console.log(`[CRON] Scan completed: ${scannedEvents.length} total, ${activeCount} active`);
  } catch (error) {
    console.error('[CRON] Error during automatic scan:', error);
  }
});

if (process.env.ENABLE_BACKGROUND_SYNC !== 'false') {
  cron.schedule(process.env.NEXON_METADATA_SYNC_CRON || '0 4 * * *', async () => {
    try {
      console.log('[CRON] Starting Nexon metadata refresh...');
      const result = await syncNexonPlayers({ limit: 90000 });
      console.log(`[CRON] Nexon metadata refreshed: ${result.requested}/${result.totalAvailable}`);
    } catch (error) {
      console.error('[CRON] Nexon metadata refresh failed:', error.message);
    }
  });

  cron.schedule(process.env.FIFAADDICT_SYNC_CRON || '*/30 * * * *', async () => {
    try {
      console.log('[CRON] Starting FIFAAddict enrichment refresh...');
      const result = await syncFifaAddict();
      console.log(`[CRON] FIFAAddict refresh completed: ${result.processed}/${result.discovered}`);
    } catch (error) {
      console.error('[CRON] FIFAAddict refresh failed:', error.message);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 FCO Hub Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`⏰ Auto-scan: Every 30 minutes`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} đang được sử dụng bởi process khác.`);
    console.error('   Tìm và tắt instance cũ:');
    console.error(`   netstat -ano | findstr :${PORT}`);
    console.error('   taskkill /PID <pid> /F');
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

export default app;
