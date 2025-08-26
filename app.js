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
import messagesRoute from './routes/messages.js';

dotenv.config();

const app = express();

// Trust the Render proxy so secure cookies work correctly
app.set('trust proxy', 1);

// Basic middleware
app.use(cors()); // adjust origin/credentials if you also serve a web SPA
app.use(express.json());

// Sessions (used for Passport login state, NOT for redirectUri anymore)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // requires HTTPS on Render
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ====== Passport Google OAuth ======
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const GOOGLE_CALLBACK_URL = `${BASE_URL}/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;

        // Find by googleId (consistent with how we create)
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,           // ✅ store googleId
            username: profile.displayName,
            email,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null); // ✅ correct variable
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id); // mongoose virtual string of _id
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ====== Routes ======
app.use('/', indexRoute);
app.use('/test', testRoute);
app.use('/messages', messagesRoute);
app.use('/users', userRoute);

// Health check
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Mongo
const uri = process.env.MONGO_URI;
if (uri && uri.trim()) {
  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err?.message || err));
} else {
  console.warn('MONGO_URI not set — skipping MongoDB connection.');
}

/**
 * Start OAuth: we NO LONGER stash redirectUri in req.session.
 * Instead we encode it into OAuth `state`, which Google echoes back.
 */
app.get('/auth/google', (req, res, next) => {
  const { redirectUri } = req.query;

  // Encode redirectUri safely into state
  const statePayload = { redirectUri: redirectUri || 'exp://localhost:19000' };
  const state = Buffer.from(JSON.stringify(statePayload), 'utf8').toString('base64url');

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state, // ✅ carry redirectUri this way
  })(req, res, next);
});

/**
 * OAuth callback: decode state, then redirect to the requested return URL
 * with user info attached. This closes the AuthSession on iOS/Android.
 */
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    let redirectUri = 'exp://localhost:19000';

    try {
      if (req.query.state) {
        const parsed = JSON.parse(Buffer.from(req.query.state, 'base64url').toString('utf8'));
        if (parsed?.redirectUri) redirectUri = parsed.redirectUri;
      }
    } catch {
      // fall back to default redirectUri
    }

    const user = req.user;
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    // Preserve existing query params if any
    const hasQuery = redirectUri.includes('?');
    const qs = new URLSearchParams({
      user: JSON.stringify(userInfo),
    }).toString();

    const finalUrl = `${redirectUri}${hasQuery ? '&' : '?'}${qs}`;
    return res.redirect(finalUrl);
  }
);

app.get('/auth/failure', (_req, res) => {
  res.status(401).send('Authentication failed.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Listening on', PORT));

export default app;
