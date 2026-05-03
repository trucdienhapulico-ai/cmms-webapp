const crypto = require('crypto');
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync('DNHc4&982!cjhDB', salt, 100000, 64, 'sha256').toString('hex');
console.log(`${salt}:${hash}`);
