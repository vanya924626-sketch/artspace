const router = require("express").Router();
const Booking = require("../models/Booking");

router.post("/", async (req, res) => {
  const booking = await Booking.create(req.body);
  res.json(booking);
});

router.get("/", async (req, res) => {
  res.json(await Booking.find());
});

module.exports = router;