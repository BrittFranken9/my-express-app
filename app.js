// server.js (ESM)
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';

import User from './models/User.js';
import testRoute from './routes/test.js';
import indexRoute from './routes/index.js';
import userRoute from './routes/users.js';
import messagesRoute from './routes/events.js';

dotenv.config();

const eventsRouter = require('./routes/events');

const app = express();

// Trust the Render proxy so secure cookies work correctly
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
if (mongoUri && mongoUri.trim()) {
  mongoose
    .connect(mongoUri) // v4+ doesn't need useNewUrlParser/useUnifiedTopology
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err?.message || err));
} else {
  console.warn('MONGO_URI not set — skipping MongoDB connection.');
}



// Sessions (used for Passport login state; NOT for redirectUri)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me', // prevents crash on missing env
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS on Render
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());


// ---- base64url helpers (work on all Node versions) ----
const toBase64Url = (str) =>
  Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (str) => {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return Buffer.from(b64, 'base64').toString('utf8');
};

// ====== Passport Google OAuth ======
const BASE_URL = process.env.BASE_URL || 'https://my-express-app-nawn.onrender.com';
const GOOGLE_CALLBACK_URL = `${BASE_URL}/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const emailRaw = profile.emails?.[0]?.value || null;
        const email = emailRaw ? emailRaw.trim().toLowerCase() : null;
        const username = profile.displayName || (email ? email.split('@')[0] : 'Google User');

        // Zoek op googleId of (indien aanwezig) email en koppel in één stap
        const query = email ? { $or: [{ googleId }, { email }] } : { googleId };
        const setFields = { googleId, username };
        if (email) setFields.email = email;

        const user = await User.findOneAndUpdate(
          query,
          { $set: setFields, $setOnInsert: {} },
          { new: true, upsert: true }
        );

        return done(null, user);
      } catch (err) {
        // Fallback: als er tóch een duplicate op email was door race-condition, link nogmaals
        if (err?.code === 11000 && err?.keyPattern?.email && profile.emails?.[0]?.value) {
          try {
            const email = profile.emails[0].value.trim().toLowerCase();
            const user = await User.findOneAndUpdate(
              { email },
              { $set: { googleId: profile.id } },
              { new: true }
            );
            if (user) return done(null, user);
          } catch (linkErr) {
            return done(linkErr, null);
          }
        }
        return done(err, null);
      }
    }
  )
);


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

// Health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// ---------- AUTH ROUTES — put BEFORE any generic "/" router ----------
app.get('/auth/google', (req, res, next) => {
  const { redirectUri } = req.query;

  // Carry redirectUri through OAuth using state (no session reliance)
  const statePayload = { redirectUri: redirectUri || 'exp://localhost:19000' };
  const state = toBase64Url(JSON.stringify(statePayload));

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
  })(req, res, next);
});

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    let redirectUri = 'exp://localhost:19000';

    try {
      if (req.query.state) {
        const parsed = JSON.parse(fromBase64Url(req.query.state));
        if (parsed?.redirectUri) redirectUri = parsed.redirectUri;
      }
    } catch {
      // fallback to default
    }

    const user = req.user;
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    const hasQuery = redirectUri.includes('?');
    const qs = new URLSearchParams({ user: JSON.stringify(userInfo) }).toString();
    const finalUrl = `${redirectUri}${hasQuery ? '&' : '?'}${qs}`;
    return res.redirect(finalUrl);
  }
);

app.get('/auth/failure', (_req, res) => res.status(401).send('Authentication failed.'));

// ---------- Other routers (specific first) ----------
app.use('/test', testRoute);
app.use('/messages', messagesRoute);
app.use('/users', userRoute);
app.use('/api/events', eventsRouter);

// ---------- Generic/index router LAST so it doesn't swallow /auth ----------
app.use('/', indexRoute);

// ---------- Mongo ----------
const uri = process.env.MONGO_URI;
if (uri && uri.trim()) {
  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err?.message || err));
} else {
  console.warn('MONGO_URI not set — skipping MongoDB connection.');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Listening on', PORT));

export default app;