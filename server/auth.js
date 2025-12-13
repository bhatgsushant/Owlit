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

// Initialize Supabase Client (Same as server.js)
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error deserializing user:", error);
      return done(error, null);
    }
    return done(null, data);
  } catch (err) {
    return done(err, null);
  }
});

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const userProfile = {
      id: profile.id,
      email: profile.emails[0].value,
      full_name: profile.displayName,
      avatar_url: profile.photos[0]?.value || '',
      updated_at: new Date()
      // Note: Age and Gender are not provided by default Google Profile scope
    };

    // Upsert into Supabase
    const { data, error } = await supabase
      .from('profiles')
      .upsert(userProfile, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error("Error saving user to Supabase:", error);
      return done(error, null);
    }

    return done(null, data);
  } catch (err) {
    return done(err, null);
  }
}));

module.exports = passport;
