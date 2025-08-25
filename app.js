import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import testRoute from './routes/test.js';
import indexRoute from './routes/index.js';
import messagesRoute from './routes/messages.js';
import userRoute from './routes/users.js';

dotenv.config();
const app = express();

app.use(express.json());

app.use('/', indexRoute);
app.use('/test', testRoute);
app.use('/messages', messagesRoute);
app.use('/users', userRoute);

// Health check
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// Alleen verbinden als MONGO_URI bestaat
const uri = process.env.MONGO_URI;
if (uri && uri.trim()) {
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err?.message || err));
} else {
  console.warn('MONGO_URI not set — skipping MongoDB connection.');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

export default app;