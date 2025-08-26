import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, unique: true, sparse: true },
    username: { type: String, required: true },
    email: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
