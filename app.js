import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors'; // 👈 nieuw

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import User from './models/User.js';

import testRoute from './routes/test.js';
import indexRoute from './routes/index.js';
import userRoute from './routes/users.js';
import messagesRoute from './routes/messages.js';

dotenv.config();
const app = express();

app.use(cors());          // 👈 belangrijk voor Expo/React Native
app.use(express.json());

app.use(session ( {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
} ));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://my-express-app-nawn.onrender.com/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // If not, create a new user
      user = await User.create({
        username: profile.displayName,
        email: email,
      });
    }
    return done(null, user);
  } catch (err) {
    return done(error, null);
  }
}));


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

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

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/',
    successRedirect: '/profile'
  })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Listening on', PORT));

export default app;
