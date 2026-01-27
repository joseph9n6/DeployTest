const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const User = require("../models/User");

function setupPassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "identifier", passwordField: "password" },
      async (identifier, password, done) => {
        try {
          const ident = (identifier || "").toLowerCase().trim();

          const user = await User.findOne({
            $or: [{ username: ident }, { email: ident }]
          });

          if (!user) {
            return done(null, false, { message: "Feil brukernavn/e-post eller passord" });
          }

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) {
            return done(null, false, { message: "Feil brukernavn/e-post eller passord" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, String(user._id));
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select("username email roles profile");
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });
}

module.exports = { setupPassport };
