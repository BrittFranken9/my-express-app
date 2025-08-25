import express from 'express';
import Message from '../models/Message.js';

const router = express.Router();

// GET: Retrieve all messages
router.get('/', async (req, res) => {
  // get all messages
  const messages = await Message.find().populate('sender', 'username email').populate('recipients', 'username email');

  res.json(messages);
});

// GET: Retreive one message by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params; // == req.params.id;
  const message = await Message.findById(id);
  res.json(message);
}); 

// POST: Add a new message
router.post('/', async (req, res) => {
  try {
    const newMessage = new Message(req.body); // Create a new instance of Message model
    await newMessage.save(); // Save to MongoDB
    res.status(201).json({ message: 'Message added successfully!', messageData: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error adding message', error: error.message });
  }
});

// PUT: Update an existing message
router.put('/:id', async (req, res) => {
  const { id } = req.params; // Get the message ID from params
  const updatedMessage = req.body; // Get the new message data from request body
  
  try {
    const message = await Message.findByIdAndUpdate(id, updatedMessage, { new: true });
    if (message) {
      res.json({ message: 'Message updated successfully!', messageData: message });
    } else {
      res.status(404).json({ message: 'Message not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating message', error: error.message });
  }
});

// DELETE: Remove a message by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params; 
  
  try {
    const message = await Message.findByIdAndDelete(id); // Find the message by ID and delete it
    if (message) {
      res.json({ message: 'Message deleted successfully!' });
    } else {
      res.status(404).json({ message: 'Message not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message', error: error.message });
  }
});


export default router;