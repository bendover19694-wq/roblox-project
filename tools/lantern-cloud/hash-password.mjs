// Usage: node hash-password.mjs, type the password and press Enter (or pipe it in). Prints a LANTERN_PASSWORD_HASH value.
import readline from 'node:readline';
import { hashPassword } from './auth.mjs';

let password = '';
for await (const line of readline.createInterface({ input: process.stdin })) { password = line; break; } // first line only, so Enter finishes it
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
console.log(await hashPassword(password));
