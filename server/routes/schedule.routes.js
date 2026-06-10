const router = require("express").Router();
const ClassSchedule = require("../models/ClassSchedule");

router.get("/", async (req, res) => {
  const data = await ClassSchedule.find();
  res.json(data);
});

router.post("/", async (req, res) => {
  const item = await ClassSchedule.create(req.body);
  res.json(item);
});

module.exports = router;