const passport = require("passport");
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Google OAuth login route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication, send JWT token in a cookie
    const token = req.user.token; // Get token from the user object returned by Passport
    res.cookie("token", token, { httpOnly: true }); // Store JWT in a secure cookie
    res.redirect("/profile");
  },
);

// Profile route after login
router.get("/profile",  (req, res) => {
  console.log("In profile route, user:", req.user); // Debugging
  res.render("profile", { user: req.user });
});
// Logout route
router.get("/logout", (req, res) => {
  // Clear the JWT token from the cookies
  res.clearCookie("token");
  
  // Optionally, call req.logout() to end the session if using session-based authentication
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // Redirect to the homepage or login page after logout
    res.redirect("/");
  });
});



// Export the router
module.exports = router;
