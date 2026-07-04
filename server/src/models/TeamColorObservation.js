import mongoose from 'mongoose';

const observationPlayerSchema = new mongoose.Schema(
  {
    slotId: { type: String, required: true },
    uid: { type: String, default: '' },
    uic: { type: String, default: '' },
  },
  { _id: false }
);

const teamColorObservationSchema = new mongoose.Schema(
  {
    payloadHash: { type: String, required: true, index: true },
    tcid: { type: String, required: true, index: true },
    category: { type: String, enum: ['club', 'grade', 'relation'], required: true },
    rawResponseItem: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadPlayers: [observationPlayerSchema],
    matchedPlayers: [observationPlayerSchema],
    qualifiedPlayers: [observationPlayerSchema],
    observedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

teamColorObservationSchema.index({ tcid: 1, observedAt: -1 });

const TeamColorObservation = mongoose.model('TeamColorObservation', teamColorObservationSchema);
export default TeamColorObservation;
