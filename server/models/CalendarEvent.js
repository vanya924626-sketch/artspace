const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  title: String,

  hallId: Number,
  teacherName: String,

  start: String,
  end: String,

  type: {
    type: String,
    enum: ["class", "rental"]
  }
});

module.exports = mongoose.model("CalendarEvent", schema);