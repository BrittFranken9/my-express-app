import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    organisation: { type: String, required: true, index: true },
    location: { type: String, required: true },
    price: { type: Number, default: 0 },
    date: { type: Date, required: true, index: true },
    website: { type: String },
    coverImage: { type: String },
    teaser: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likesCount: { type: Number, default: 0 },
    goingCount: { type: Number, default: 0 },
    photos: [PhotoSchema]
  },
  { timestamps: true }
);

EventSchema.index({ date: 1 });
EventSchema.index({ organisation: 1 });

export default mongoose.model('Event', EventSchema);
