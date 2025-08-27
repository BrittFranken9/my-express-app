import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    // NEW: saved to identify the creator of the event
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    organizerName: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    organizationName: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      default: null,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    teaser: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    location: {
      type: String,
      required: false,
      trim: true,
      default: '',
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

    // Raw keywords entered by user, e.g. "music; festival; outdoor"
    keywordsRaw: {
      type: String,
      default: '',
      trim: true,
    },
    // Normalized keyword list for search/filtering
    keywords: {
      type: [String],
      index: true,
      default: [],
    },

    // Aggregated counts (per-user state stored in UserEvent)
    likesCount: { type: Number, default: 0 },
    goingCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Normalize keywords from keywordsRaw before save
EventSchema.pre('save', function (next) {
  try {
    const raw = (this.keywordsRaw || '').toString();
    const parts = raw
      .split(/[;,]/)         // split on ; or ,
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
  teaser: 'text',
  organizerName: 'text',
  organizationName: 'text',
  location: 'text',
});

export default mongoose.model('Event', EventSchema);
