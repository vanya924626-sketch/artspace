const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,

  role: {
    type: String,
    enum: ["admin", "choreographer", "dancer", "renter"],
    default: "dancer"
  },

  subscription: {
    type: String,
    default: "single"
  },

  remainingClasses: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("User", userSchema);