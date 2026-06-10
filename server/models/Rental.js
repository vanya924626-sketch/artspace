const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: String,
  hallId: Number,

  date: String,
  start: String,
  end: String,

  status: {
    type: String,
    default: "pending"
  }
});

module.exports = mongoose.model("Rental", schema);