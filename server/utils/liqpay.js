javascript


const crypto = require('crypto');
const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY;
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY;
function createPayment({ orderId, amount, description, resultUrl, serverUrl }) {
  const params = {
    public_key: PUBLIC_KEY,
    version: '3',
    action: 'pay',
    amount: amount,
    currency: 'UAH',
    description: description,
    order_id: orderId,
    result_url: resultUrl,
    server_url: serverUrl
  };
  const data = Buffer.from(JSON.stringify(params)).toString('base64');
  const signature = crypto
    .createHash('sha1')
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest('base64');
  return { data, signature };
}
function verifyCallback(data, signature) {
  const expected = crypto
    .createHash('sha1')
    .update(PRIVATE_KEY + data + PRIVATE_KEY)
    .digest('base64');
  return expected === signature;
}
function decodeData(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
}
module.exports = { createPayment, verifyCallback, decodeData };