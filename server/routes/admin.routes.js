const router = require("express").Router();

router.get("/", async (req, res) => {
  res.json({
    message: "Admin API works"
  });
});

module.exports = router;