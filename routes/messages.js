// routes/messages.js (met MongoDB)
import express from 'express';
import Message from '../models/Message.js'; // 👈 pak het Mongoose model

const router = express.Router();

// GET /messages -> haal uit MongoDB
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error('GET /messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /messages -> maak in MongoDB
router.post('/', async (req, res) => {
  try {
    const { text, sender, recipients } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const msg = await Message.create({ text, sender, recipients });
    res.status(201).json(msg);
  } catch (err) {
    console.error('POST /messages error:', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

export default router;
