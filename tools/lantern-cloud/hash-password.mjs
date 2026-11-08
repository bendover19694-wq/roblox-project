// Usage: node hash-password.mjs  (type or pipe the password on stdin). Prints a LANTERN_PASSWORD_HASH value.
import { hashPassword } from './auth.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const password = input.replace(/[\r\n]+$/, '');
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}
console.log(await hashPassword(password));
