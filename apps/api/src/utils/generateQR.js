const QRCode = require('qrcode');

const generateQR = async (trackingId, baseUrl = 'http://localhost:5173') => {
  const url = `${baseUrl}/track/${trackingId}`;
  const base64 = await QRCode.toDataURL(url, { width: 300, margin: 2 });
  return base64;
};

module.exports = generateQR;
