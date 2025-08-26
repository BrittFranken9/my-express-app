import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    // Google OAuth
    googleId: { type: String, index: true, unique: true, sparse: true },
    email: { type: String, index: true, sparse: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },

    // Optional device identifier (if your RN app used it before)
    deviceId: { type: String, index: true, sparse: true },

    // Event relations
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    going: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
