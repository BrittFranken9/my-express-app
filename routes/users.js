// routes/users.js
import express from 'express';
import User from '../models/User.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
});

router.post('/', async (req, res) => {
  const { username, name, email } = req.body;
  if (!username || !name || !email) return res.status(400).json({ error: 'Missing fields' });
  const user = await User.create({ username, name, email });
  res.status(201).json(user);
});

export default router;