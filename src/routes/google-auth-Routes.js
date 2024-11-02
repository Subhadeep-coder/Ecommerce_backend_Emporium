const passport = require("passport");
const express = require("express");
const router = express.Router();

// Google OAuth login route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth callback route (common for web and mobile)
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication, get JWT token
    const token = req.user.token;

    // Check if the request is from mobile or web
    if (req.headers['user-agent'].includes('Mobile') || req.query.mobile) {
      // For mobile, redirect to app using deep link
      res.redirect(`com.myapp://auth?token=${token}`);
    } else {
      // For web, set JWT token in a cookie
      res.cookie("token", token, { httpOnly: true });
      res.redirect("/profile");
    }
  },
);

// Profile route after login (for web)
router.get("/profile", (req, res) => {
  if (!req.user) {
    return res.redirect("/"); // Redirect to home if not logged in
  }
  res.render("profile", { user: req.user });
});

// Logout route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;