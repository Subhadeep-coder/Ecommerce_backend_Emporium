const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const DeliveryAgentModel = require("../models/deliveryAgentModel");

function deliveryAgentAuth() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    let agent = await DeliveryAgentModel.findOne({ googleId: profile.id });

                    if (!agent) {
                        agent = await DeliveryAgentModel.create({
                            googleId: profile.id,
                            email: profile.emails[0].value,
                            fullname: profile.displayName,
                            profilePic: profile.photos[0].value,
                            phoneNumber: Math.floor(1000000000 + Math.random() * 9000000000),
                        });
                    }

                    const token = jwt.sign(
                        { id: agent._id, email: agent.email },
                        process.env.JWT_SECRET,
                        { expiresIn: "1h" }
                    );

                    return done(null, { agent, token });
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );

    passport.serializeUser((agentObj, done) => {
        done(null, agentObj.agent._id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const agent = await DeliveryAgentModel.findById(id);
            done(null, agent);
        } catch (error) {
            done(error, null);
        }
    });
}

module.exports = deliveryAgentAuth;
