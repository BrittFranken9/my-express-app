// routes/messages.js
import express from 'express';
const router = express.Router();

// Eenvoudige in-memory store (werkt ook zonder DB)
let messages = [
  { _id: '1', text: 'Hello' },
  { _id: '2', text: 'from the TEST!' }
];

// GET /messages -> lijst (Array)
router.get('/', (req, res) => {
  res.json(messages);
});

// (Optioneel) POST /messages -> nieuw bericht toevoegen
router.post('/', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }
  const msg = { _id: String(Date.now()), text };
  messages.push(msg);
  res.status(201).json(msg);
});

export default router;
