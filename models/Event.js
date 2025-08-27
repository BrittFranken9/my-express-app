import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    // identify the creator
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // NEW: title
    title: {
      type: String,
      default: '',
      trim: true,
    },

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

    keywordsRaw: {
      type: String,
      default: '',
      trim: true,
    },
    keywords: {
      type: [String],
      index: true,
      default: [],
    },

    likesCount: { type: Number, default: 0 },
    goingCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Normalize keywords
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
  title: 'text',           // include title in the text index
  teaser: 'text',
  organizerName: 'text',
  organizationName: 'text',
  location: 'text',
});

export default mongoose.model('Event', EventSchema);
