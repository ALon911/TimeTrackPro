// Simple test to check .env file loading
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Testing .env file loading...');

// Try different paths
const paths = [
  '.env',
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env')
];

paths.forEach(envPath => {
  console.log(`\nTrying path: ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.log('❌ Error:', result.error.message);
  } else {
    console.log('✅ Success');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
  }
});
