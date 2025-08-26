import User from '../models/User.js';
import Event from '../models/Event.js';

// Keeps support for your previous "upsert by device" flow (in addition to Google)
export const upsertUser = async (req, res) => {
  const { deviceId, displayName, avatarUrl, email } = req.body || {};
  if (!displayName && !deviceId) {
    return res.status(400).json({ message: 'displayName or deviceId required' });
  }
  const query = deviceId ? { deviceId } : email ? { email } : { displayName };
  let user = await User.findOne(query);
  if (!user) {
    user = await User.create({ deviceId, displayName: displayName || `User-${Date.now()}`, avatarUrl, email });
  } else if (displayName || avatarUrl) {
    user.displayName = displayName ?? user.displayName;
    user.avatarUrl = avatarUrl ?? user.avatarUrl;
    await user.save();
  }
  res.status(201).json(user);
};

export const archiveLikes = async (req, res) => {
  const user = await User.findById(req.params.userId).populate('likes').lean();
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.likes || []);
};

export const archiveGoing = async (req, res) => {
  const user = await User.findById(req.params.userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const events = await Event.find({ _id: { $in: user.going } }).lean();
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now);
  const past = events.filter(e => new Date(e.date) < now);

  res.json({ upcoming, past });
};

export const archivePast = async (req, res) => {
  const user = await User.findById(req.params.userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const now = new Date();
  const events = await Event.find({
    date: { $lt: now },
    $or: [{ _id: { $in: user.going } }, { createdBy: user._id }]
  })
    .sort({ date: -1 })
    .lean();

  res.json(events);
};
