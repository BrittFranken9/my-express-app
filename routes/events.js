import express from 'express';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import UserEvent from '../models/UserEvent.js';

const router = express.Router();

/**
 * Create an event (all fields optional)
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
 * List events with optional filters
 * ?q, ?keywords, ?ownerId, ?fromDate, ?toDate, ?page, ?limit, ?sort
 */
router.get('/', async (req, res) => {
  try {
    const {
      q,
      keywords,
      ownerId,
      fromDate,
      toDate,
      page = 1,
      limit = 12,
      sort = '-date',
    } = req.query;

    const filter = {};

    if (q && String(q).trim()) {
      filter.$text = { $search: String(q).trim() };
    }

    if (keywords && String(keywords).trim()) {
      const arr = String(keywords)
        .split(/[;,]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (arr.length) filter.keywords = { $in: arr };
    }

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    if (ownerId && String(ownerId).trim()) {
      if (mongoose.Types.ObjectId.isValid(ownerId)) {
        filter.ownerId = new mongoose.Types.ObjectId(ownerId);
      } else {
        // If ownerId was stored as string, match that string value
        filter.ownerId = String(ownerId);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Event.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Event.countDocuments(filter),
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

/**
 * Archive: events a user liked/going
 * GET /events/mine/list?userId=...&status=like|going&page=1&limit=12
 */
router.get('/mine/list', async (req, res) => {
  const { userId, status = 'like', page = 1, limit = 12 } = req.query;

  if (!['like', 'going'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Accept ObjectId or string for user
  const userFilter = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : String(userId || '');

  if (!userFilter) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const [rows, total] = await Promise.all([
      UserEvent.find({ user: userFilter, status })
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit))
        .populate('event'),
      UserEvent.countDocuments({ user: userFilter, status }),
    ]);

    return res.json({
      items: rows.map((r) => r.event),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/** Get one event */
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    return res.json(event);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/** Patch event */
router.patch('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false });
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
    await UserEvent.deleteMany({ event: deleted._id });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Toggle like / going
 * POST /events/:id/like
 * POST /events/:id/going
 * Body: { userId, on }
 */
async function toggleUserEvent(req, res, statusKey) {
  const { userId, on } = req.body;
  const eventId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
  if (!['like', 'going'].includes(statusKey)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Accept ObjectId or string for user
  const userFilter = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : String(userId || '');

  if (!userFilter) {
    return res.status(400).json({ error: 'Missing user id' });
  }

  try {
    if (on) {
      // add (create if not exists)
      await UserEvent.updateOne(
        { user: userFilter, event: eventId, status: statusKey },
        { $setOnInsert: { user: userFilter, event: eventId, status: statusKey } },
        { upsert: true }
      );
      // bump counters on Event
      const inc = statusKey === 'like' ? { likesCount: 1 } : { goingCount: 1 };
      await Event.updateOne({ _id: eventId }, { $inc: inc });
    } else {
      // remove if exists
      const del = await UserEvent.findOneAndDelete({ user: userFilter, event: eventId, status: statusKey });
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

export default router;
