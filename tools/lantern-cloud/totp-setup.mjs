// Usage: node totp-setup.mjs. Prints a new TOTP_SECRET for Render and the key to type into an authenticator app.
import { randomBytes } from 'node:crypto';
import { base32Encode } from './auth.mjs';

const secret = base32Encode(randomBytes(20));
console.log(`TOTP_SECRET=${secret}`);
console.log('');
console.log('In Google Authenticator, Microsoft Authenticator, Authy or 1Password: add an account, choose "enter a setup key",');
console.log(`name it DV Enterprises, paste ${secret}, type "Time based". Or open this link on the phone that has the app:`);
console.log(`otpauth://totp/DV%20Enterprises:owner?secret=${secret}&issuer=DV%20Enterprises&algorithm=SHA1&digits=6&period=30`);
