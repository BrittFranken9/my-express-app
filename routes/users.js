import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET: Retrieve all users
router.get('/', async (req, res) => {
  // get all users
  const users = await User.find();

  res.json(users);
});

// GET: Retreive one user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params; // == req.params.id;
  const user = await User.findById(id);
  res.json(user);
}); 

// POST: Add a new user
router.post('/', async (req, res) => {
  try {
    const newUser = new User(req.body); // Create a new instance of User model
    await newUser.save(); // Save to MongoDB
    res.status(201).json({ user: 'User added successfully!', userData: newUser });
  } catch (error) {
    res.status(500).json({ user: 'Error adding user', error: error.user });
  }
});

// PUT: Update an existing user
router.put('/:id', async (req, res) => {
  const { id } = req.params; // Get the user ID from params
  const updatedUser = req.body; // Get the new user data from request body
  
  try {
    const user = await User.findByIdAndUpdate(id, updatedUser, { new: true });
    if (user) {
      res.json({ user: 'User updated successfully!', userData: user });
    } else {
      res.status(404).json({ user: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ user: 'Error updating user', error: error.user });
  }
});

// DELETE: Remove a user by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params; 
  
  try {
    const user = await User.findByIdAndDelete(id); // Find the user by ID and delete it
    if (user) {
      res.json({ user: 'User deleted successfully!' });
    } else {
      res.status(404).json({ user: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ user: 'Error deleting user', error: error.user });
  }
});


export default router;