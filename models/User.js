import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true }, // blijft uniek
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);