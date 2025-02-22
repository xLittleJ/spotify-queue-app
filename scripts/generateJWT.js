const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(16).toString('hex');

console.log('JWT_SECRET_KEY:', secret);
console.log('JWT_ENCRYPTION_KEY:', encryptionKey);
