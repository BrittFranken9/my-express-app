import mongoose from 'mongoose';

const UserEventSchema = new mongoose.Schema(
  {
    // Accept either an ObjectId (typical) OR a string (e.g., external auth id)
    user: { type: mongoose.Schema.Types.Mixed, required: true, index: true },

    // Always an ObjectId referencing Event
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },

    // 'like' or 'going'
    status: { type: String, enum: ['like', 'going'], required: true, index: true },
  },
  { timestamps: true }
);

// Speed up "my archive" queries
UserEventSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model('UserEvent', UserEventSchema);
