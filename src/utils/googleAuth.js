const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

function auth() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback", // URL for Google to redirect after login
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            // If user doesn't exist, create one
            user = await User.create({
              googleId: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              username: profile.emails[0].value.split("@")[0],
              profileImage: profile.photos[0].value,
            });
          }

          // Generate JWT token
          const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" },
          );

          // Pass user and token
          return done(null, { user, token });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((userObj, done) => {
    done(null, userObj.user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

module.exports = auth;