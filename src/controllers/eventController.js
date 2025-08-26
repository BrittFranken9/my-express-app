import { z } from 'zod';
import Event from '../models/Event.js';
import User from '../models/User.js';

const eventSchema = z.object({
  title: z.string().min(2),
  organisation: z.string().min(2),
  location: z.string().min(2),
  price: z.number().min(0).optional().default(0),
  date: z.coerce.date(),
  website: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  teaser: z.string().optional().or(z.literal('')),
  createdBy: z.string().optional()
});

export const listEvents = async (req, res) => {
  const { upcoming = 'true', search = '', page = '1', limit = '20' } = req.query;

  const now = new Date();
  const filters = {};
  if (search) {
    filters.$or = [
      { title: new RegExp(search, 'i') },
      { organisation: new RegExp(search, 'i') },
      { location: new RegExp(search, 'i') }
    ];
  }
  if (upcoming === 'true') filters.date = { $gte: now };
  else if (upcoming === 'false') filters.date = { $lt: now };

  const p = Math.max(parseInt(page), 1);
  const l = Math.min(Math.max(parseInt(limit), 1), 100);

  const [items, total] = await Promise.all([
    Event.find(filters).sort({ date: 1 }).skip((p - 1) * l).limit(l).lean(),
    Event.countDocuments(filters)
  ]);

  res.json({ items, page: p, limit: l, total });
};

export const getEvent = async (req, res) => {
  const event = await Event.findById(req.params.id).lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json(event);
};

export const createEvent = async (req, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const event = await Event.create(parsed.data);
  res.status(201).json(event);
};

export const updateEvent = async (req, res) => {
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const event = await Event.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json(event);
};

export const deleteEvent = async (req, res) => {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json({ ok: true });
};

export const likeEvent = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const [event, user] = await Promise.all([Event.findById(req.params.id), User.findById(userId)]);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const hasLiked = user.likes.some(id => id.equals(event._id));
  if (hasLiked) {
    user.likes = user.likes.filter(id => !id.equals(event._id));
    event.likesCount = Math.max(0, event.likesCount - 1);
  } else {
    user.likes.push(event._id);
    event.likesCount += 1;
  }

  await Promise.all([user.save(), event.save()]);
  res.json({ liked: !hasLiked, likesCount: event.likesCount });
};

export const rsvpEvent = async (req, res) => {
  const { userId, going } = req.body;
  if (!userId || typeof going !== 'boolean') {
    return res.status(400).json({ message: 'userId and going(boolean) required' });
  }

  const [event, user] = await Promise.all([Event.findById(req.params.id), User.findById(userId)]);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const alreadyGoing = user.going.some(id => id.equals(event._id));
  if (going && !alreadyGoing) {
    user.going.push(event._id);
    event.goingCount += 1;
  }
  if (!going && alreadyGoing) {
    user.going = user.going.filter(id => !id.equals(event._id));
    event.goingCount = Math.max(0, event.goingCount - 1);
  }

  await Promise.all([user.save(), event.save()]);
  res.json({ going, goingCount: event.goingCount });
};

export const addPhotos = async (req, res) => {
  const { userId, photos } = req.body;
  if (!userId || !Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ message: 'userId and non-empty photos[] required' });
  }

  const [event, user] = await Promise.all([Event.findById(req.params.id), User.findById(userId)]);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const toAdd = photos
    .filter(u => typeof u === 'string' && u.trim())
    .map(u => ({ url: u.trim(), uploadedBy: user._id }));

  event.photos.push(...toAdd);
  await event.save();

  res.status(201).json({ added: toAdd.length, photos: event.photos });
};

export const getPhotos = async (req, res) => {
  const event = await Event.findById(req.params.id)
    .select('photos')
    .populate('photos.uploadedBy', 'displayName avatarUrl')
    .lean();
  if (!event) return res.status(404).json({ message: 'Event not found' });
  res.json(event.photos || []);
};
