import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sourceUrl: {
      type: String,
      required: true,
    },
    launchUrl: {
      type: String,
      required: true,
    },
    dateLabel: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Unknown', 'Expired'],
      default: 'Unknown',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isSubdomain: {
      type: Boolean,
      default: false,
    },
    isNewsPage: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
eventSchema.index({ status: 1, endDate: -1 });
eventSchema.index({ launchUrl: 1 }, { unique: true });

const Event = mongoose.model('Event', eventSchema);

export default Event;