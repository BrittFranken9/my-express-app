import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.serializeUser((user, done) => {
  // minimize session size
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const u = await User.findById(id);
    done(null, u || null);
  } catch (e) {
    done(e);
  }
});

// src/config/passport.js
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Google OAuth env vars missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
}


passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID || 'missing',
      clientSecret: GOOGLE_CLIENT_SECRET || 'missing',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const displayName = profile.displayName || profile.emails?.[0]?.value || 'Google User';
        const avatarUrl = profile.photos?.[0]?.value;
        const email = profile.emails?.[0]?.value;

        let user = await User.findOne({ googleId });
        if (!user) {
          // also try matching by email to avoid dupes if they used deviceId previously
          if (email) {
            user = await User.findOne({ email });
          }
        }
        if (!user) {
          user = await User.create({
            googleId,
            displayName,
            avatarUrl,
            email
          });
        } else {
          // keep profile fresh
          user.displayName = displayName || user.displayName;
          user.avatarUrl = avatarUrl || user.avatarUrl;
          user.email = email || user.email;
          await user.save();
        }
        done(null, user);
      } catch (e) {
        done(e);
      }
    }
  )
);
