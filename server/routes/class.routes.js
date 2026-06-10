const router = require("express").Router();
const Class = require("../models/Class");

router.get("/", async (req, res) => {
  res.json(await Class.find());
});

router.post("/", async (req, res) => {
  res.json(await Class.create(req.body));
});

module.exports = router;