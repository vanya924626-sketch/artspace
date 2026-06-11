const router = require("express").Router();

router.get("/", async (req, res) => {
  res.json([]);
});

router.post("/", async (req, res) => {
  res.json({ success: true });
});

module.exports = router;