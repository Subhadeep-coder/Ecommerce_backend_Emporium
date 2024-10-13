const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(function () {
    console.log("connected to database");
  })
  .catch(function (err) {
    dbgr(err);
  });

let db = mongoose.connection;
module.exports = db;
