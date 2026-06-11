const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/class", require("./routes/class.routes"));
app.use("/api/rental", require("./routes/rental.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

mongoose.connect(process.env.DB_PATH)
  .then(() => console.log("DB connected"));

app.listen(process.env.PORT || 3000);