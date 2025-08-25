import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
    // tijdelijk niet required zodat je kunt posten zonder user
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;