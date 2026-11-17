'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = value => String(value || '').trim().toLowerCase();
function validEmail(email) { return email.length <= 254 && EMAIL_RE.test(email); }
function validPassword(password) { return typeof password === 'string' && password.length >= 12 && password.length <= 128 && Buffer.byteLength(password, 'utf8') <= 512; }
function validName(name) { return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 120; }
function randomToken() { return crypto.randomBytes(32).toString('base64url'); }
function digest(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, {N:16384,r:8,p:1,maxmem:32*1024*1024});
  return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}
async function checkPassword(password, encoded) {
  try {
    const parts = encoded.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== '16384' || parts[2] !== '8' || parts[3] !== '1') return false;
    const oldKey = Buffer.from(parts[5], 'hex');
    if (oldKey.length !== 64) return false;
    const key = await scrypt(password, parts[4], oldKey.length, {N:16384,r:8,p:1,maxmem:32*1024*1024});
    return crypto.timingSafeEqual(key, oldKey);
  } catch (_) { return false; }
}
function publicUser(row) { return {id:row.id,name:row.full_name,fullName:row.full_name,email:row.email,createdAt:row.created_at,emailVerified:true}; }
module.exports={normalizeEmail,validEmail,validPassword,validName,randomToken,digest,hashPassword,checkPassword,publicUser};
