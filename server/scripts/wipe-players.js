import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Player from '../src/models/Player.js';
import PlayerAlias from '../src/models/PlayerAlias.js';
import PlayerEnrichment from '../src/models/PlayerEnrichment.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const [enrichmentResult, playerResult, aliasResult] = await Promise.all([
  PlayerEnrichment.deleteMany({}),
  Player.deleteMany({}),
  PlayerAlias.deleteMany({}),
]);

console.log(`Đã xóa PlayerEnrichment: ${enrichmentResult.deletedCount}`);
console.log(`Đã xóa Player: ${playerResult.deletedCount}`);
console.log(`Đã xóa PlayerAlias: ${aliasResult.deletedCount}`);
console.log('SyncRun được giữ lại (không xóa).');

await mongoose.disconnect();
