const router = require("express").Router();
const Rental = require("../models/Rental");

router.post("/", async (req, res) => {
  res.json(await Rental.create(req.body));
});

router.get("/", async (req, res) => {
  res.json(await Rental.find());
});

module.exports = router;