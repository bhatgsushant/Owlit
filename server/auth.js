const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const getEnvOrThrow = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const GOOGLE_CLIENT_ID = getEnvOrThrow('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getEnvOrThrow('GOOGLE_CLIENT_SECRET');

// In-memory user store
const users = {};

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, users[id]);
});

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    displayName: profile.displayName,
    firstName: profile.name?.givenName || '',
    lastName: profile.name?.familyName || '',
    email: profile.emails[0].value,
    avatar: profile.photos[0].value,
    provider: 'google'
  };
  users[profile.id] = user;
  return done(null, user);
}));

module.exports = passport;
