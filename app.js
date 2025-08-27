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
import eventsRoute from './routes/events.js';

dotenv.config();

const app = express();

// Trust the Render proxy so secure cookies work correctly
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

// ----- Session / Passport -----
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
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

// ---- base64url helpers ----
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

        // Link by googleId OR existing email
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
    } catch { /* ignore */ }

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
app.use('/users', userRoute);
app.use('/api/events', eventsRoute);

// ---------- Generic/index router LAST so it doesn't swallow /auth ----------
app.use('/', indexRoute);

// ---------- Start server first (Render needs the port open quickly) ----------
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT}`);
});

// ---------- Connect to MongoDB asynchronously (no double connect) ----------
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI || !MONGO_URI.trim()) {
  console.warn('[mongo] MONGO_URI not set — skipping MongoDB connection.');
} else {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    })
    .then(() => console.log('[mongo] connected'))
    .catch((err) => {
      console.error('[mongo] connection error:', err?.message || err);
      // Server keeps running; /healthz shows DB state
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[server] SIGTERM received');
  try {
    await mongoose.connection.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
});

export default app;
