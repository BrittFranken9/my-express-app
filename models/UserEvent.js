// models/UserEvent.js
import mongoose from 'mongoose';

const UserEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    // either "like" or "going"
    status: { type: String, enum: ['like', 'going'], required: true },
  },
  { timestamps: true }
);

// A user can only have one row per (event, status)
UserEventSchema.index({ user: 1, event: 1, status: 1 }, { unique: true });

export default mongoose.model('UserEvent', UserEventSchema);
