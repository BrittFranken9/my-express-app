// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, required: true },
    email: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
