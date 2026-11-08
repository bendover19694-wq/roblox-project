// Usage: node hash-password.mjs, type the password and press Enter (or pipe it in). Prints a LANTERN_PASSWORD_HASH value.
import readline from 'node:readline';
import { hashPassword } from './auth.mjs';

const rl = readline.createInterface({ input: process.stdin });
const password = await new Promise((resolve) => {
  rl.once('line', (l) => { rl.close(); resolve(l); });
  rl.once('close', () => resolve(''));
});
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
console.log(await hashPassword(password));
