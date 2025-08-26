import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';
import passport from 'passport';

import { connectDB, getMongooseConnection } from './src/config/db.js';
import './src/config/passport.js';

import eventRoutes from './src/routes/events.js';
import userRoutes from './src/routes/users.js';
import authRoutes from './src/routes/auth.js';
import { notFound, errorHandler } from './src/middleware/error.js';

dotenv.config();

const app = express();

// DB
await connectDB();

// Security & parsing
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS (allow cookies)
const allowed = [];
if (process.env.CLIENT_ORIGIN) allowed.push(process.env.CLIENT_ORIGIN);
allowed.push(/\.onrender\.com$/); // allow your deployed frontend too

app.use(
  cors({
    origin: allowed.length ? allowed : true,
    credentials: true
  })
);

app.use(morgan('dev'));

// Sessions stored in Mongo (so Google login persists across restarts)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false // set true when behind HTTPS-only proxy (Render) if you terminate TLS in the platform
    },
    store: MongoStore.create({
      client: getMongooseConnection().getClient(),
      stringify: false,
      ttl: 60 * 60 * 24 * 7 // 7 days
    })
  })
);

// Passport (Google OAuth 2.0)
app.use(passport.initialize());
app.use(passport.session());

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), user: req.user ?? null });
});

// Auth + API routes
app.use('/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);

// Errors
app.use(notFound);
app.use(errorHandler);

// PORT 3000 (as requested)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
