// routes/events.js
import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import UserEvent from '../models/UserEvent.js';

const router = express.Router();

/**
 * Create an event
 * Body:
 *  - organizerName (required)
 *  - organizationName (optional)
 *  - date (required, ISO string or timestamp)
 *  - imageUrl (required)
 *  - teaser (required)
 *  - location (required)
 *  - ticketsUrl (optional)
 *  - websiteUrl (optional)
 *  - keywordsRaw (optional string with ';' separators)
 */
router.post('/', async (req, res) => {
  try {
    const event = await Event.create(req.body);
    return res.status(201).json(event);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * List events with optional search & pagination
 * Query params:
 *  - q (text search across teaser/organizer/org/location)
 *  - keywords (semicolon-separated string; matches any)
 *  - fromDate, toDate (ISO date strings)
 *  - page (default 1), limit (default 12)
 *  - sort (default "-date" = upcoming first; use "date" for old->new)
 */
router.get('/', async (req, res) => {
  try {
    const {
      q,
      keywords,
      fromDate,
      toDate,
      page = 1,
      limit = 12,
      sort = '-date',
    } = req.query;

    const filter = {};

    // Date range
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    // Keywords: any match
    if (keywords && typeof keywords === 'string') {
      const arr = keywords.split(';').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.keywords = { $in: arr };
    }

    // Text search
    let query = Event.find(filter);
    if (q && q.trim()) {
      query = Event.find({
        ...filter,
        $text: { $search: q.trim() },
      });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(Number(limit)).lean(),
      query.countDocuments(),
    ]);

    return res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/** Get single event */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Not found' });
    return res.json(event);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid id' });
  }
});

/** Update event (partial) */
router.patch('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ error: 'Not found' });
    return res.json(event);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/** Delete event */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    // Also clean up UserEvent rows for this event
    await UserEvent.deleteMany({ event: deleted._id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid id' });
  }
});

/**
 * Toggle like / going
 * POST /:id/like
 * POST /:id/going
 * Body:
 *  - userId (required)  <-- from your my-app auth/session
 *  - on (boolean)       <-- true = add, false = remove
 */
async function toggleUserEvent(req, res, statusKey) {
  const { userId, on } = req.body;
  const eventId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (typeof on !== 'boolean') {
    return res.status(400).json({ error: '`on` must be boolean' });
  }

  try {
    const exists = await Event.exists({ _id: eventId });
    if (!exists) return res.status(404).json({ error: 'Event not found' });

    if (on) {
      // add (create if not exists)
      await UserEvent.updateOne(
        { user: userId, event: eventId, status: statusKey },
        { $setOnInsert: { user: userId, event: eventId, status: statusKey } },
        { upsert: true }
      );
      // bump counters on Event (denormalized)
      const inc = statusKey === 'like' ? { likesCount: 1 } : { goingCount: 1 };
      await Event.updateOne({ _id: eventId }, { $inc: inc });
    } else {
      // remove if exists
      const del = await UserEvent.findOneAndDelete({ user: userId, event: eventId, status: statusKey });
      if (del) {
        const inc = statusKey === 'like' ? { likesCount: -1 } : { goingCount: -1 };
        await Event.updateOne({ _id: eventId }, { $inc: inc });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

router.post('/:id/like', (req, res) => toggleUserEvent(req, res, 'like'));
router.post('/:id/going', (req, res) => toggleUserEvent(req, res, 'going'));

/**
 * Get a user's liked/going events (for your archive page)
 * GET /mine?userId=...&status=like|going&page=1&limit=12
 */
router.get('/mine/list', async (req, res) => {
  const { userId, status = 'like', page = 1, limit = 12 } = req.query;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (!['like', 'going'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const [rows, total] = await Promise.all([
      UserEvent.find({ user: userId, status })
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .populate('event')
        .lean(),
      UserEvent.countDocuments({ user: userId, status }),
    ]);

    return res.json({
      items: rows.map(r => r.event),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
