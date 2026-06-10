const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  studentId: String,
  classId: String,
  present: Boolean
});

module.exports = mongoose.model("Attendance", schema);