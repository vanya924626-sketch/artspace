const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  teacherName: String,
  hallId: Number,

  title: String,
  dayOfWeek: String,

  timeStart: String,
  timeEnd: String
});

module.exports = mongoose.model("ClassSchedule", schema);