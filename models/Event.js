import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    // Store owner as STRING for consistency with the app's AsyncStorage userId
    ownerId: { type: String, index: true },

    // Optional title (shown in lists)
    title: { type: String, default: '', trim: true },

    organizerName: { type: String, default: '', trim: true },
    organizationName: { type: String, default: '', trim: true },

    date: { type: Date, default: null },

    imageUrl: { type: String, default: '', trim: true },
    teaser: { type: String, default: '', trim: true, maxlength: 400 },
    location: { type: String, default: '', trim: true },

    ticketsUrl: { type: String, default: '', trim: true },
    websiteUrl: { type: String, default: '', trim: true },

    keywordsRaw: { type: String, default: '', trim: true },
    keywords: { type: [String], index: true, default: [] },

    likesCount: { type: Number, default: 0 },
    goingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Normalize keywords from keywordsRaw before save
EventSchema.pre('save', function (next) {
  try {
    const raw = (this.keywordsRaw || '').toString();
    const parts = raw
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    this.keywords = parts;
    return next();
  } catch (err) {
    return next(err);
  }
});

// Text index for quick search
EventSchema.index({
  title: 'text',
  teaser: 'text',
  organizerName: 'text',
  organizationName: 'text',
  location: 'text',
});

export default mongoose.model('Event', EventSchema);
