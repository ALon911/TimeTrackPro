// בדיקה פשוטה יותר - נשתמש ב-API קיים עם בקשה ישירה
// Run with: node test-invitation.js

import fetch from 'node-fetch';

async function sendTestInvitation() {
  try {
    // פשוט נעשה בקשה ישירה לנתיב שבדקנו שהוא עובד
    // הנתיב הזה בדוק בדף server/direct-member-route.ts
    const response = await fetch('http://localhost:5000/add-direct-member/1/alon.najman@gmail.com');
    const text = await response.text();
    
    console.log('Response:', response.status);
    console.log('Response body:', text.substring(0, 200) + '...');
    console.log('בקשת הזמנה נשלחה למייל alon.najman@gmail.com');
    console.log('בדוק את המייל שלך לקישור ההזמנה.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

sendTestInvitation();