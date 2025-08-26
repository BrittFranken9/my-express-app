import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Start Google OAuth (request basic profile + email)
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

// OAuth callback (success -> redirect back to your client; failure -> /auth/failure)
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure', session: true }),
  (req, res) => {
    // In dev, default to a simple JSON; in prod, redirect to your client
    const redirectTo = process.env.CLIENT_ORIGIN || '/auth/me';
    // If you want a hard redirect to the app web URL, do: res.redirect(redirectTo);
    // For RN/Expo, you may handle with deep link if desired.
    res.redirect(redirectTo);
  }
);

router.get('/failure', (req, res) => {
  res.status(401).json({ ok: false, message: 'Google authentication failed' });
});

// Who am I? (returns the logged-in user object from the session)
router.get('/me', (req, res) => {
  res.json({ authenticated: !!req.user, user: req.user || null });
});

// Logout (destroys the session)
router.post('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  });
});

export default router;
