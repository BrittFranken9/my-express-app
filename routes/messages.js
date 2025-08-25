import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';

const router = express.Router();

// GET all
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'username email')
      .populate('recipients', 'username email')
      .lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// GET by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }
    const message = await Message.findById(id)
      .populate('sender', 'username email')
      .populate('recipients', 'username email')
      .lean();
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching message', error: error.message });
  }
});

// POST
router.post('/', async (req, res) => {
  try {
    const { text, sender, recipients } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: "Field 'text' is required (string)" });
    }
    const newMessage = await Message.create({
      text,
      ...(sender ? { sender } : {}),
      ...(Array.isArray(recipients) ? { recipients } : {}),
    });
    res.status(201).json({ message: 'Message added successfully!', messageData: newMessage });
  } catch (error) {
    // ValidationError => 400
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: 'Error adding message', error: error.message });
  }
});

// PUT
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }
    const updated = await Message.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: 'Message updated successfully!', messageData: updated });
  } catch (error) {
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: 'Error updating message', error: error.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }
    const removed = await Message.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ message: 'Message not found' });
    res.json({ message: 'Message deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
});

export default router;