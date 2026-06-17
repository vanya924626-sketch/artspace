const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: String,
  hallId: Number,

  date: String,
  timeStart: String,
  timeEnd: String,

  status: {
    type: String,
    default: "pending"
  }
});

module.exports = mongoose.model("Booking", schema);