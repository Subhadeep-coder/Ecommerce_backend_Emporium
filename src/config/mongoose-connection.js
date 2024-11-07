const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

mongoose
  .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true , serverSelectionTimeoutMS: 30000,})
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    dbgr("Error connecting to the database:", err);
  });

let db = mongoose.connection;
db.on("error", (err) => {
  dbgr("Connection error:", err);
});

module.exports = db;
