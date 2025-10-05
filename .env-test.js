require('dotenv').config();
console.log('Testing dotenv loading:');
console.log('EMAIL_USER from .env:', process.env.EMAIL_USER);
console.log('EMAIL_PASS from .env:', process.env.EMAIL_PASS ? '***' : 'not set');
console.log('EMAIL_FROM from .env:', process.env.EMAIL_FROM);
