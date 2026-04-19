import fs from 'fs';
import path from 'path';

const dir = '.vercel';
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('.vercel removed successfully');
} else {
  console.log('.vercel does not exist');
}
