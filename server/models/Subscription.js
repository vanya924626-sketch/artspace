const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: String,
  type: String,
  remaining: Number
});

module.exports = mongoose.model("Subscription", schema);