const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  title: String,
  teacherName: String,

  hallId: Number,

  day: String,
  start: String,
  end: String
});

module.exports = mongoose.model("Class", schema);