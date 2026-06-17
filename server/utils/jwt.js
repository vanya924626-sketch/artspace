const jwt = require("jsonwebtoken");

module.exports = {
  sign: (data) => jwt.sign(data, process.env.JWT_SECRET),
  verify: (token) => jwt.verify(token, process.env.JWT_SECRET)
};