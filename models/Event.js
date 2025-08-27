import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    organizerName: {
      type: String,
      required: [true, 'Organizer name is required'],
      trim: true,
    },
    organizationName: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    teaser: {
      type: String,
      required: [true, 'Teaser description is required'],
      trim: true,
      maxlength: 400,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    ticketsUrl: {
      type: String,
      default: '',
      trim: true,
    },
    websiteUrl: {
      type: String,
      default: '',
      trim: true,
    },

    // We store both the raw string (for exact display) AND a normalized array (for search)
    keywordsRaw: {
      type: String,
      default: '',
      trim: true,
    },
    keywords: {
      type: [String],
      index: true, // helps keyword-based search
      default: [],
    },

    // Simple counts (denormalized) for quick listing; real per-user state is in UserEvent
    likesCount: { type: Number, default: 0 },
    goingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Normalize keywordsRaw into keywords array on save
EventSchema.pre('save', function normalizeKeywords(next) {
  if (typeof this.keywordsRaw === 'string') {
    const arr = this.keywordsRaw
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
    this.keywords = arr;
  }
  next();
});

// Text index for full-text search (teaser + organizer + org + location)
EventSchema.index({
  teaser: 'text',
  organizerName: 'text',
  organizationName: 'text',
  location: 'text',
});

export default mongoose.model('Event', EventSchema);
