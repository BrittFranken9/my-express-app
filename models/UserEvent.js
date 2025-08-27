import mongoose from 'mongoose';

// We store user as STRING so it matches whatever the app has in AsyncStorage('userId')
const UserEventSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    status: { type: String, enum: ['like', 'going'], required: true, index: true },
  },
  { timestamps: true }
);

// fast queries: all of a user's liked/going in order
UserEventSchema.index({ user: 1, status: 1, createdAt: -1 });

// avoid duplicates: a user can have at most one row per (event, status)
UserEventSchema.index({ user: 1, event: 1, status: 1 }, { unique: true });

export default mongoose.model('UserEvent', UserEventSchema);
