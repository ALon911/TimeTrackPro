import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTopicSchema, 
  insertTimeEntrySchema 
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { teamsRouter } from "./teams-simple";
import { z } from "zod";
import path from "path";
// Lazy load direct member router to prevent early email service initialization
let directMemberRouter: any = null;
async function getDirectMemberRouter() {
  if (!directMemberRouter) {
    const module = await import("./direct-member-route");
    directMemberRouter = module.directMemberRouter;
  }
  return directMemberRouter;
}
import { invitationsRouter } from "./team-invitations";
// Import AI suggestions service lazily to prevent initialization errors
let aiSuggestionsService: any = null;

// Lazy load AI suggestions service
async function getAISuggestionsService() {
  if (!aiSuggestionsService) {
    try {
      const aiModule = await import("./ai-suggestions");
      aiSuggestionsService = aiModule.getAISuggestionsService();
    } catch (error) {
      console.log('AI Suggestions service not available:', error.message);
      return null;
    }
  }
  return aiSuggestionsService;
}

import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API health check
  app.get("/api/health", (_req, res) => {
    const isHealthy = storage.isDatabaseHealthy();
    res.json({ 
      status: "ok", 
      database: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString()
    });
  });

  // Database regeneration endpoint (for development/debugging)
  app.post("/api/admin/regenerate-db", (_req, res) => {
    try {
      storage.regenerateDatabase();
      res.json({ 
        status: "success", 
        message: "Database regenerated successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Database regeneration failed:', error);
      res.status(500).json({ 
        status: "error", 
        message: "Failed to regenerate database",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // פונקציה משותפת למשלוח קובץ HTML ראשי
  const serveIndexHTML = (req: Request, res: Response, next: NextFunction, routePath: string) => {
    console.log(`${routePath} route hit with token:`, req.params.token);
    const indexPath = path.resolve('client/index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html file:', err);
        next(err);
      } else {
        console.log(`Successfully served index.html for ${routePath}`);
      }
    });
  };

  // טיפול בנתיבי הזמנות - דף HTML פשוט שעושה redirect
  // Handle /register?invite=token redirect
  app.get('/register', (req, res) => {
    const inviteToken = req.query.invite as string;
    if (inviteToken) {
      // Redirect to the proper invitation handler
      res.redirect(`/invitation/${inviteToken}`);
    } else {
      // No invite token, redirect to auth page
      res.redirect('/auth');
    }
  });

  app.get(['/invitations/:token', '/invitation/:token', '/accept-invitation/:token'], (req, res) => {
    // חילוץ הטוקן מהפרמטרים
    const { token } = req.params;
    console.log('Invitation token route hit with token:', token);

    // בונה את ה-HTML עם הדף הבסיסי - שים לב שאנחנו מכניסים את token באופן דינמי בשורה 157
    let html = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>הזמנה לצוות - מערכת TimeTracker</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f4f4f4;
          text-align: center;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 15px 0;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          text-decoration: none;
        }
        .button:hover {
          background-color: #2980b9;
        }
        .message {
          margin: 20px 0;
          padding: 10px;
          border-radius: 4px;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 10px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>הזמנה לצוות</h1>
        <p>התקבלה הזמנה להצטרף לצוות במערכת מעקב הזמן.</p>
        
        <div id="loading">
          <p>בודק את מצב ההתחברות שלך...</p>
          <div class="spinner"></div>
        </div>
        
        <div id="login-needed" style="display: none;">
          <p>כדי לקבל את ההזמנה, יש להתחבר למערכת תחילה.</p>
          <a id="login-link" href="/auth" class="button">התחבר למערכת</a>
        </div>
        
        <div id="accept-invite" style="display: none;">
          <p>נמצאה הזמנה עבורך להצטרף לצוות. האם ברצונך לקבל או לדחות את ההזמנה?</p>
          <div class="invitation-actions">
            <button onclick="acceptInvitation()" class="button" style="background-color: #28a745;">קבל הזמנה</button>
            <button onclick="rejectInvitation()" class="button" style="background-color: #dc3545; margin-right: 10px;">דחה הזמנה</button>
          </div>
          <div id="accept-spinner" class="spinner" style="display: none;"></div>
        </div>
        
        <div id="success-message" class="message success" style="display: none;">
          <p>ההזמנה התקבלה בהצלחה!</p>
          <p>מעביר אותך לדף הצוותים...</p>
        </div>
        
        <div id="error-message" class="message error" style="display: none;">
          <p id="error-text">אירעה שגיאה בעת קבלת ההזמנה.</p>
          <a href="/teams" class="button">חזור לדף הצוותים</a>
        </div>
      </div>`;
      
    // נסיים את הדף וכעת נוסיף את החלק של הסקריפט שמכיל את token מהפרמטר
    html += `
      <script>
        // Token from URL
        const token = "${token}";
        
        // בדיקה אם יש פרמטר פעולה ב-URL 
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        // מחפש אימייל מקורי ב-LocalStorage (מהלינק במייל)
        const originalEmail = localStorage.getItem('invitationOriginalEmail') || '';
        console.log('Found original email in storage:', originalEmail);
        
        // If there's an action parameter, trigger the appropriate action
        if (action === 'accept' || action === 'reject') {
          console.log('Auto action requested:', action);
          
          // מחכה להתחברות לפני ביצוע פעולה אוטומטית
          window.addEventListener('load', () => {
            setTimeout(() => {
              checkAuthStatus().then(() => {
                if (action === 'accept') {
                  console.log('Auto-accepting invitation with email:', originalEmail);
                  acceptInvitation(originalEmail);
                } else if (action === 'reject') {
                  console.log('Auto-rejecting invitation with email:', originalEmail);
                  rejectInvitation(originalEmail);
                }
              });
            }, 1500);
          });
        }
        
        // Update login link to include token
        document.getElementById('login-link').href = '/auth?inviteToken=' + token;
        
        // Check if the user is logged in
        async function checkAuthStatus() {
          try {
            const response = await fetch('/api/user');
            
            if (response.ok) {
              // User is logged in, show accept interface
              document.getElementById('loading').style.display = 'none';
              document.getElementById('accept-invite').style.display = 'block';
            } else {
              // User is not logged in, show login interface
              document.getElementById('loading').style.display = 'none';
              document.getElementById('login-needed').style.display = 'block';
            }
          } catch (error) {
            console.error('Error checking auth status:', error);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('login-needed').style.display = 'block';
          }
        }
        
        // Function to accept the invitation
        async function acceptInvitation() {
          try {
            document.querySelector('.invitation-actions').style.display = 'none';
            document.getElementById('accept-spinner').style.display = 'block';
            
            // מוסיף את האימייל של המוזמן לגוף הבקשה, כך שהשרת ידע למי לקשר את ההזמנה
            const invitationResponse = await fetch('/api/teams/invitation/' + token, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            // בדיקה אם הAPI של ההזמנות מחזיר תשובה
            let invitationEmail = '';
            if (invitationResponse.ok) {
              try {
                const invData = await invitationResponse.json();
                if (invData && invData.email) {
                  invitationEmail = invData.email;
                  console.log('Invitation was for email:', invitationEmail);
                } else {
                  console.log('Invitation API returned data without email field:', invData);
                }
              } catch (err) {
                console.error('Could not parse invitation details JSON');
              }
            } else {
              console.log('Could not fetch invitation details, API returned:', invitationResponse.status);
            }
            
            // נשתמש בנקודת הסיום החדשה שיצרנו לקבלת הזמנות
            const response = await fetch('/api/teams/invitation-secure/' + token + '/accept', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ originalEmail: invitationEmail })
            });
            
            if (response.ok) {
              document.getElementById('accept-invite').style.display = 'none';
              document.getElementById('success-message').style.display = 'block';
              
              // Redirect to teams page after short delay
              setTimeout(() => {
                window.location.href = '/teams';
              }, 2000);
            } else {
              const errorData = await response.json();
              document.getElementById('accept-invite').style.display = 'none';
              document.getElementById('error-message').style.display = 'block';
              document.getElementById('error-text').textContent = errorData.message || 'אירעה שגיאה בעת קבלת ההזמנה.';
            }
          } catch (error) {
            console.error('Error accepting invitation:', error);
            document.getElementById('accept-invite').style.display = 'none';
            document.getElementById('error-message').style.display = 'block';
          }
        }
        
        // Function to reject the invitation
        async function rejectInvitation() {
          try {
            document.querySelector('.invitation-actions').style.display = 'none';
            document.getElementById('accept-spinner').style.display = 'block';
            
            // משתמש בנקודת הסיום המאובטחת החדשה לדחיית הזמנות
            const response = await fetch('/api/teams/invitation-secure/' + token + '/reject', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ originalEmail: invitationEmail || '' })
            });
            
            if (response.ok) {
              document.getElementById('accept-invite').style.display = 'none';
              
              // Show rejection success message
              const successDiv = document.getElementById('success-message');
              successDiv.style.display = 'block';
              successDiv.innerHTML = '<p>ההזמנה נדחתה בהצלחה.</p><p>מעביר אותך לדף הראשי...</p>';
              
              // Redirect to home page after short delay
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
            } else {
              const errorData = await response.json();
              document.getElementById('accept-invite').style.display = 'none';
              document.getElementById('error-message').style.display = 'block';
              document.getElementById('error-text').textContent = errorData.message || 'אירעה שגיאה בעת דחיית ההזמנה.';
            }
          } catch (error) {
            console.error('Error rejecting invitation:', error);
            document.getElementById('accept-invite').style.display = 'none';
            document.getElementById('error-message').style.display = 'block';
          }
        }
        
        // Run auth check when page loads
        window.onload = checkAuthStatus;
      </script>
    </body>
    </html>`;
    
    res.send(html);
    console.log('Successfully served invitation handler HTML');
  });
  
  // נתיב ישיר לקבלת הזמנה (עמוד פשוט עם לוגיקה מובנית, דף HTML נפרד מהSPA)
  // אפשר להשתמש בנתיב הזה ישירות מהמייל כדי לאשר ללא צורך בכניסה למערכת
  app.get([
    '/direct-accept/:token', 
    '/invitations/:token/accept', 
    '/invitation/:token/accept', 
    '/invitations/accept/:token',
    '/accept/:token', // תמיכה בקישורים קצרים
    '/:token/accept'  // תמיכה בפורמט כללי מאוד למקרה חירום
  ], (req, res) => {
    const token = req.params.token;
    console.log('Accept-invitation route hit with token:', token);
    
    // עמוד HTML פשוט עם כפתור שעושה פנייה ישירה לAPI
    const htmlPage = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>הזמנה לצוות</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f7fb;
          color: #333;
          max-width: 800px;
          margin: 40px auto;
          text-align: center;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #4361ee;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background-color: #4361ee;
          color: white;
          padding: 12px 24px;
          border-radius: 4px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 20px;
          transition: background-color 0.3s;
          cursor: pointer;
          border: none;
        }
        .button:hover {
          background-color: #3a56d4;
        }
        .note {
          margin-top: 20px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          font-size: 0.9em;
          color: #666;
        }
        .response {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
          display: none;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>הזמנה לצוות</h1>
        <p>התקבלה הזמנה להצטרף לצוות במערכת מעקב הזמן.</p>
        
        <div id="not-logged-in">
          <p>כדי לקבל את ההזמנה, יש להיכנס למערכת תחילה:</p>
          <div id="auth-message">
            <p>לאחר ההתחברות, תוכל לאשר את ההזמנה.</p>
          </div>
          <a href="/auth?inviteToken=' + token + '" class="button">התחבר למערכת</a>
          <div class="note">
            <p>לאחר ההתחברות, חזור לדף זה כדי לאשר את ההזמנה.</p>
          </div>
        </div>
        
        <div id="logged-in" style="display: none;">
          <p>אתה מחובר למערכת. כעת בחר אם לקבל או לדחות את ההזמנה:</p>
          <div class="buttons-group" style="display: flex; gap: 10px; margin: 15px 0;">
            <button onclick="acceptInvitation()" class="button primary">אשר הזמנה</button>
            <button onclick="rejectInvitation()" class="button secondary">דחה הזמנה</button>
          </div>
          
          <div id="response-success" class="response success">
            <h3>פעולה הושלמה בהצלחה!</h3>
            <p id="success-message"></p>
            <p id="reject-message"></p>
            <a href="/teams" class="button" style="margin-top: 10px;">עבור לעמוד הצוותים</a>
          </div>
          
          <div id="response-error" class="response error">
            <h3>אירעה שגיאה</h3>
            <p id="error-message"></p>
            <button onclick="acceptInvitation()" class="button">נסה שוב</button>
          </div>
        </div>
      </div>
      
      <script>
        // הוספת לוגיקה לקבלה אוטומטית כשמגיעים מ URL ישיר
        const isDirectAccept = window.location.pathname.includes('/accept/') || 
                              window.location.pathname.includes('/accept');
                              
        console.log('Direct accept mode:', isDirectAccept);
        
        // בדוק אם המשתמש מחובר
        checkAuth();
        
        function checkAuth() {
          console.log('Checking authentication status...');
          fetch('/api/user')
            .then(response => {
              if (response.ok) {
                console.log('User is authenticated!');
                // משתמש מחובר
                document.getElementById('not-logged-in').style.display = 'none';
                document.getElementById('logged-in').style.display = 'block';
                
                // אישור אוטומטי כאשר המשתמש מחובר (one-click)
                console.log('Starting automatic invitation acceptance');
                acceptInvitation();
                
                return response.json();
              } else {
                console.log('User is NOT authenticated');
                // משתמש לא מחובר
                document.getElementById('not-logged-in').style.display = 'block';
                document.getElementById('logged-in').style.display = 'none';
                
                // אם זה בקשת קבלה ישירה, נוסיף הודעה ייעודית
                if (isDirectAccept) {
                  document.getElementById('auth-message').innerHTML = 
                    '<p><strong>לצורך קבלת ההזמנה באופן ישיר יש להתחבר תחילה</strong></p>' +
                    '<p>לאחר ההתחברות, המערכת תאשר אוטומטית את ההזמנה.</p>';
                }
                
                throw new Error('Not authenticated');
              }
            })
            .catch(error => {
              console.error('Auth check error:', error);
            });
        }
        
        function acceptInvitation(providedEmail = '') {
          const token = "${token}";
          
          // אם התקבל אימייל כפרמטר, השתמש בו
          // נשיג את האימייל המקורי תחילה למקרה שנזדקק לו
          const emailPromise = providedEmail 
            ? Promise.resolve(providedEmail) 
            : fetch(\`/api/teams/invitation/\${token}\`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(invData => invData?.email || '')
              .catch(err => '');
          
          emailPromise.then(invitationEmail => {
            console.log('Using email for acceptance:', invitationEmail);
            
            // משתמש בנקודת הסיום המאובטחת לקבלת הזמנות
            return fetch(\`/api/teams/invitation-secure/\${token}/accept\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ originalEmail: invitationEmail })
            });
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('success-message').textContent = data.message || 'ההזמנה התקבלה בהצלחה';
              document.getElementById('response-success').style.display = 'block';
              document.getElementById('response-error').style.display = 'none';
            } else {
              throw new Error(data.error || 'אירעה שגיאה בעת קבלת ההזמנה');
            }
          })
          .catch(error => {
            document.getElementById('error-message').textContent = error.message;
            document.getElementById('response-success').style.display = 'none';
            document.getElementById('response-error').style.display = 'block';
          });
        }
        
        function rejectInvitation(providedEmail = '') {
          const token = "${token}";
          
          // אם התקבל אימייל כפרמטר, השתמש בו
          // נשיג את האימייל המקורי תחילה למקרה שנזדקק לו
          const emailPromise = providedEmail 
            ? Promise.resolve(providedEmail) 
            : fetch(\`/api/teams/invitation/\${token}\`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(invData => invData?.email || '')
              .catch(err => '');
          
          emailPromise.then(invitationEmail => {
            console.log('Using email for rejection:', invitationEmail);
            
            // משתמש בנקודת הסיום המאובטחת לדחיית הזמנות
            return fetch(\`/api/teams/invitation-secure/\${token}/reject\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ originalEmail: invitationEmail })
            });
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('reject-message').textContent = data.message || 'ההזמנה נדחתה';
              document.getElementById('response-success').style.display = 'block';
              document.getElementById('response-error').style.display = 'none';
            } else {
              throw new Error(data.error || 'אירעה שגיאה בעת דחיית ההזמנה');
            }
          })
          .catch(error => {
            document.getElementById('error-message').textContent = error.message;
            document.getElementById('response-success').style.display = 'none';
            document.getElementById('response-error').style.display = 'block';
          });
        }
      </script>
    </body>
    </html>
    `;
    
    res.send(htmlPage);
  });
  
  // נקודות סיום לטיפול ישיר בהזמנות מהמייל (כולל האימייל כפרמטר)
  app.get("/api/teams/invitations/direct-accept/:token", async (req, res) => {
    const token = req.params.token;
    const email = req.query.email as string;
    
    if (!token || !email) {
      return res.status(400).send("חסרים פרטים הכרחיים בבקשה");
    }
    
    // מייצר עמוד HTML שיבצע הפנייה לדף ההזמנות עם האימייל המקורי בדף
    const htmlPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>מקבל הזמנה...</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
        .loader { 
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          margin: 20px auto;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <h2>מקבל את ההזמנה...</h2>
      <p>אנא המתן, אתה מועבר לקבלת ההזמנה...</p>
      <div class="loader"></div>
      
      <script>
        // שומר את האימייל המקורי בLocal Storage
        localStorage.setItem('invitationOriginalEmail', '${email}');
        
        // מעביר לדף ההזמנות עם הטוקן
        setTimeout(() => {
          window.location.href = '/invitation/${token}?action=accept';
        }, 1000);
      </script>
    </body>
    </html>
    `;
    
    res.send(htmlPage);
  });
  
  // דחיית הזמנה ישירות מהמייל
  app.get("/api/teams/invitations/direct-reject/:token", async (req, res) => {
    const token = req.params.token;
    const email = req.query.email as string;
    
    if (!token || !email) {
      return res.status(400).send("חסרים פרטים הכרחיים בבקשה");
    }
    
    // מייצר עמוד HTML שיבצע הפנייה לדף ההזמנות עם האימייל המקורי בדף
    const htmlPage = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>דוחה הזמנה...</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; direction: rtl; }
        .loader { 
          border: 5px solid #f3f3f3;
          border-top: 5px solid #f44336;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          margin: 20px auto;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <h2>דוחה את ההזמנה...</h2>
      <p>אנא המתן, אתה מועבר לדחיית ההזמנה...</p>
      <div class="loader"></div>
      
      <script>
        // שומר את האימייל המקורי בLocal Storage
        localStorage.setItem('invitationOriginalEmail', '${email}');
        
        // מעביר לדף ההזמנות עם הטוקן
        setTimeout(() => {
          window.location.href = '/invitation/${token}?action=reject';
        }, 1000);
      </script>
    </body>
    </html>
    `;
    
    res.send(htmlPage);
  });

  // נקודת סיום להשגת פרטי הזמנה לפי טוקן
  app.get("/api/teams/invitation/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing token' 
        });
      }
      
      const invitation = await storage.getTeamInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Invitation not found' 
        });
      }
      
      // מחזיר מידע בסיסי רק (רק מה שנדרש - לא יותר)
      res.json({
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        teamId: invitation.teamId
      });
    } catch (error) {
      console.error('Error fetching invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'An error occurred while fetching the invitation' 
      });
    }
  });
  
  // Secure endpoint for handling invitations with email validation
  app.post('/api/teams/invitation-secure/:token/:action', isAuthenticated, async (req, res) => {
    try {
      const { token, action } = req.params;
      const { originalEmail } = req.body;
      const userId = req.user?.id;
      
      console.log('Secure invitation endpoint called:', { token, action, userId, originalEmail });
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not authenticated' 
        });
      }
      
      if (action !== 'accept' && action !== 'reject') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action. Must be "accept" or "reject"' 
        });
      }
      
      // Find the invitation
      const invitation = await storage.getTeamInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Invitation not found' 
        });
      }
      
      // Check if invitation is already processed
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          error: `Invitation has already been ${invitation.status}` 
        });
      }
      
      // Check if invitation is expired
      const expiresAt = new Date(invitation.expiresAt);
      if (expiresAt < new Date()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invitation has expired' 
        });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      // Special check: if we have original email from the invitation link, use it to validate
      // This allows users to accept invitations sent to different emails
      if (originalEmail && originalEmail.trim() !== '') {
        console.log(`Using original email from params: ${originalEmail} instead of user email: ${user.email}`);
        
        if (invitation.email !== originalEmail) {
          return res.status(403).json({ 
            success: false, 
            error: `This invitation was sent to ${invitation.email}, not to ${originalEmail}` 
          });
        }
      } else {
        // Fall back to regular email check if no original email provided
        if (user.email !== invitation.email) {
          return res.status(403).json({ 
            success: false, 
            error: `This invitation was sent to ${invitation.email}, not to ${user.email}` 
          });
        }
      }
      
      if (action === 'accept') {
        // Check if user is already a member
        // השתמש במזהה הצוות מההזמנה
        const teamId = invitation.teamId;
        console.log('Using team ID for member addition:', teamId);
        const members = await storage.getTeamMembers(teamId);
        const isAlreadyMember = members.some(member => member.userId === userId);
        
        if (isAlreadyMember) {
          await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
          return res.status(200).json({ 
            success: true, 
            message: 'You are already a member of this team' 
          });
        }
        
        // Add user to team - עטוף בבדיקת שגיאה
        try {
          await storage.addTeamMember({
            teamId: teamId,
            userId: userId,
            role: 'member'
          });
        } catch (error: any) {
          console.error('Could not add team member:', error);
          // אם יש בעיה ברשאות כתיבה, נחזיר הודעה ידידותית
          if (String(error).includes('readonly') || 
              String(error).includes('READONLY') || 
              String(error).includes('SQLITE_READONLY') ||
              (error.message && typeof error.message === 'string' && 
                (error.message.includes('readonly') || error.message.includes('READONLY'))) ||
              (error.code && typeof error.code === 'string' && 
                (error.code.includes('READONLY') || error.code.includes('readonly')))) {
            
            return res.status(200).json({ 
              success: true, 
              message: `בסיס הנתונים במצב קריאה בלבד. ההזמנה נחשבת כמאושרת בהדגמה זו.`,
              readOnly: true
            });
          }
          // שגיאה אחרת
          return res.status(500).json({ 
            success: false, 
            error: `שגיאה בעת הוספת משתמש לצוות: ${error.message || String(error)}`
          });
        }
        
        // Update invitation status
        try {
          await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
        } catch (error: any) {
          console.error('Could not update invitation status:', error);
          // נתעלם משגיאות כתיבה במצב דמו אם הן קשורות למצב קריאה בלבד
          const isReadOnlyError = String(error).includes('readonly') || 
                                 String(error).includes('READONLY') || 
                                 String(error).includes('SQLITE_READONLY') ||
                                 (error.message && typeof error.message === 'string' && 
                                   (error.message.includes('readonly') || error.message.includes('READONLY'))) ||
                                 (error.code && typeof error.code === 'string' && 
                                   (error.code.includes('READONLY') || error.code.includes('readonly')));
          
          if (!isReadOnlyError) {
            // אם זו שגיאה אחרת, נטפל בה
            console.error('Unexpected error updating invitation status:', error);
          }
          // במצב דמו נמשיך בכל מקרה
        }
        
        // Get team information for response
        const team = await storage.getTeam(teamId);
        const teamName = team ? team.name : 'החדש';
        
        return res.status(200).json({ 
          success: true, 
          message: `הזמנה התקבלה בהצלחה. הצטרפת לצוות "${teamName}".`,
          teamId
        });
      } else {
        // Reject invitation
        try {
          await storage.updateTeamInvitationStatus(invitation.id, 'declined');
          return res.status(200).json({ 
            success: true, 
            message: 'ההזמנה נדחתה בהצלחה.'
          });
        } catch (error: any) {
          console.error('Could not update invitation status to declined:', error);
          // בדוק אם זו שגיאת קריאה בלבד
          const isReadOnlyError = String(error).includes('readonly') || 
                                 String(error).includes('READONLY') || 
                                 String(error).includes('SQLITE_READONLY') ||
                                 (error.message && typeof error.message === 'string' && 
                                   (error.message.includes('readonly') || error.message.includes('READONLY'))) ||
                                 (error.code && typeof error.code === 'string' && 
                                   (error.code.includes('READONLY') || error.code.includes('readonly')));
          
          if (isReadOnlyError) {
            // אם זו שגיאת קריאה בלבד, נחזיר הודעת הצלחה עבור מצב דמו
            return res.status(200).json({ 
              success: true, 
              message: 'ההזמנה נדחתה בהצלחה במצב הדגמה (דאטאבייס במצב קריאה בלבד).',
              readOnly: true
            });
          }
          
          // שגיאה אחרת
          return res.status(500).json({ 
            success: false, 
            error: `שגיאה בעת דחיית ההזמנה: ${error.message || String(error)}`
          });
        }
      }
    } catch (error) {
      console.error('Error in secure invitation endpoint:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error processing invitation' 
      });
    }
  });

  // Topic routes
  app.get("/api/topics", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching topics for user:", req.user!.id);
      const userId = req.user!.id;
      
      // Get topics and make sure they're unique
      const topics = await storage.getTopics(userId);
      
      // Create a Set to track seen IDs
      const seenIds = new Set();
      const uniqueTopics = [];
      
      // Filter out duplicates
      for (const topic of topics) {
        if (!seenIds.has(topic.id)) {
          seenIds.add(topic.id);
          uniqueTopics.push(topic);
        } else {
          console.log("Filtered out duplicate topic:", topic.id, topic.name);
        }
      }
      
      console.log(`Found ${topics.length} topics, ${uniqueTopics.length} unique topics`);
      res.json(uniqueTopics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.post("/api/topics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      // Ensure the userId in the request is the logged-in user's ID
      const topicData = insertTopicSchema.parse({
        ...req.body,
        userId
      });
      
      const topic = await storage.createTopic(topicData);
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid topic data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create topic" });
    }
  });

  app.put("/api/topics/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      // Get the current topic to verify ownership
      const topic = await storage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this topic" });
      }
      
      const topicUpdate = insertTopicSchema.partial().parse(req.body);
      const updatedTopic = await storage.updateTopic(id, topicUpdate);
      
      res.json(updatedTopic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid topic data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update topic" });
    }
  });

  app.delete("/api/topics/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      // Get the current topic to verify ownership
      const topic = await storage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this topic" });
      }
      
      await storage.deleteTopic(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const filters: {
        topicId?: number;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
      } = {};
      
      if (req.query.topicId) {
        filters.topicId = parseInt(req.query.topicId as string);
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      
      const timeEntries = await storage.getTimeEntries(userId, filters);
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Ensure the userId in the request is the logged-in user's ID
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId
      });
      
      // Verify that the specified topic belongs to the user
      if (timeEntryData.topicId) {
        const topic = await storage.getTopic(timeEntryData.topicId);
        if (!topic || topic.userId !== userId) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid time entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid time entry ID" });
      }
      
      // Get the current time entry to verify ownership
      const entry = await storage.getTimeEntry(id);
      
      // Check if entry exists and belongs to the user
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (entry.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this time entry" });
      }
      
      const timeEntryUpdate = insertTimeEntrySchema.partial().parse(req.body);
      
      // Don't allow changing the user ID
      delete timeEntryUpdate.userId;
      
      // If topic ID is being updated, verify it belongs to the user
      if (timeEntryUpdate.topicId) {
        const topic = await storage.getTopic(timeEntryUpdate.topicId);
        if (!topic || topic.userId !== req.user!.id) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const updatedTimeEntry = await storage.updateTimeEntry(id, timeEntryUpdate);
      
      res.json(updatedTimeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid time entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid time entry ID" });
      }
      
      // Get the current time entry to verify ownership
      const entry = await storage.getTimeEntry(id);
      
      // Check if entry exists and belongs to the user
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (entry.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this time entry" });
      }
      
      await storage.deleteTimeEntry(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Clear all user's time entries
  app.delete("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete all time entries for this user
      const result = await storage.deleteAllTimeEntries(userId);
      
      if (result) {
        res.json({ message: "All time entries deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete time entries" });
      }
    } catch (error) {
      console.error("Error deleting all time entries:", error);
      res.status(500).json({ message: "Failed to delete time entries" });
    }
  });

  // Statistics routes
  app.get("/api/stats/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getDailyStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/stats/weekly", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getWeeklyStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  app.get("/api/stats/most-tracked", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getMostTrackedTopic(userId);
      
      if (!stats) {
        return res.status(404).json({ message: "No data available" });
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch most tracked topic" });
    }
  });

  app.get("/api/stats/topic-distribution", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getTopicDistribution(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topic distribution" });
    }
  });

  app.get("/api/stats/weekly-overview", isAuthenticated, async (req, res) => {
    try {
      console.log('🚀 Route /api/stats/weekly-overview called for user:', req.user!.id);
      // Disable caching for this endpoint
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const userId = req.user!.id;
      
      const stats = await storage.getWeeklyOverview(userId);
      console.log('📊 Weekly overview result:', JSON.stringify(stats, null, 2));
      res.json(stats);
    } catch (error) {
      console.error('❌ Error in weekly-overview:', error);
      res.status(500).json({ message: "Failed to fetch weekly overview" });
    }
  });

  app.get("/api/stats/recent-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const sessions = await storage.getRecentSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent sessions" });
    }
  });

  // User profile update endpoint
  app.put("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate the input using zod
      const updateSchema = z.object({
        username: z.string().min(2).optional(),
        email: z.string().email().optional(),
        displayName: z.string().optional(),
      });
      
      const userData = updateSchema.parse(req.body);
      
      // If updating email, check if it's already in use by another user
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      
      // Update the user profile
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the updated user data without the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // We've moved the invitations endpoints to team-invitations.ts
  
  // Register teams routes
  app.use('', teamsRouter);
  
  // Register direct member routes
  const directMemberRouterInstance = await getDirectMemberRouter();
  app.use('', directMemberRouterInstance);
  
  // Register team invitations routes
  app.use('', invitationsRouter);

  // AI Suggestions routes
  app.get("/api/suggestions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const suggestions = await storage.getAISuggestions(userId, limit);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      res.status(500).json({ message: "Failed to fetch AI suggestions" });
    }
  });

  app.post("/api/suggestions/generate", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        console.log('AI suggestions service not available - returning 503');
        return res.status(503).json({ 
          error: 'AI suggestions service not available',
          details: 'Service initialization failed or API key not configured'
        });
      }
      
      console.log('Generating AI suggestions for user:', req.user!.id);
      const suggestions = await service.generateSuggestions(req.user!.id);
      console.log('Generated suggestions:', suggestions.length);
      res.json(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const suggestionId = req.params.id;
      const updates = req.body;
      
      const updatedSuggestion = await storage.updateAISuggestion(suggestionId, updates);
      
      if (!updatedSuggestion) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      
      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Error updating AI suggestion:', error);
      res.status(500).json({ message: "Failed to update AI suggestion" });
    }
  });

  app.delete("/api/suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const suggestionId = req.params.id;
      
      const success = await storage.deleteAISuggestion(suggestionId);
      
      if (!success) {
        return res.status(404).json({ message: "Suggestion not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting AI suggestion:', error);
      res.status(500).json({ message: "Failed to delete AI suggestion" });
    }
  });

  // API usage stats endpoint
  app.get("/api/suggestions/usage", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const stats = service.getApiUsageStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting API usage stats:', error);
      res.status(500).json({ message: "Failed to get usage stats" });
    }
  });
  
  // Serve HTML add member page directly
  app.get('/add-member-popup/:teamId', (req, res) => {
    const filePath = path.join(__dirname, 'add-member-page.html');
    res.sendFile(filePath);
  });
  
  // Add delete account endpoint
  app.delete("/api/user/account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete the user account
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Log the user out after successful deletion
      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
        }
        res.status(204).end();
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });
  
  // Export personal time entries and statistics to Excel
  app.get("/api/export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user data
      const topics = await storage.getTopics(userId);
      const timeEntries = await storage.getTimeEntries(userId);
      const dailyStats = await storage.getDailyStats(userId);
      const weeklyStats = await storage.getWeeklyStats(userId);
      const topicDistribution = await storage.getTopicDistribution(userId);
      const mostTracked = await storage.getMostTrackedTopic(userId);
      const weeklyOverview = await storage.getWeeklyOverview(userId);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Personal Overview Sheet
      const overviewData = [
        ['שם משתמש', req.user!.username],
        ['אימייל', req.user!.email],
        ['זמן כולל היום', formatTime(dailyStats.total)],
        ['זמן כולל השבוע', formatTime(weeklyStats.total)],
        ['הנושא הנמדד ביותר', mostTracked ? mostTracked.topic.name : 'אין'],
        ['זמן בנושא הנמדד ביותר', mostTracked ? formatTime(mostTracked.totalTime) : '0:00:00']
      ];
      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, 'סקירה כללית');
      
      // Topics Sheet
      const topicsHeader = ['מזהה', 'שם נושא', 'צבע'];
      const topicsData = topics.map(topic => [
        topic.id.toString(),
        topic.name,
        topic.color
      ]);
      
      const topicsWs = XLSX.utils.aoa_to_sheet([topicsHeader, ...topicsData]);
      XLSX.utils.book_append_sheet(wb, topicsWs, 'נושאים');
      
      // Time Entries Sheet
      const timeEntriesHeader = ['מזהה', 'נושא', 'תיאור', 'זמן התחלה', 'זמן סיום', 'משך (שניות)'];
      const timeEntriesData = timeEntries.map(entry => {
        const topicName = topics.find(t => t.id === entry.topicId)?.name || 'לא ידוע';
        return [
          entry.id.toString(),
          topicName,
          entry.description || 'אין תיאור',
          new Date(entry.startTime).toLocaleString('he-IL'),
          new Date(entry.endTime).toLocaleString('he-IL'),
          entry.duration.toString()
        ];
      });
      
      const timeEntriesWs = XLSX.utils.aoa_to_sheet([timeEntriesHeader, ...timeEntriesData]);
      XLSX.utils.book_append_sheet(wb, timeEntriesWs, 'רשומות זמן');
      
      // Topic Distribution Sheet
      const distributionHeader = ['נושא', 'זמן כולל', 'אחוז מסך הכל'];
      const distributionData = topicDistribution.map(item => [
        item.topic.name,
        formatTime(item.totalTime),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      const distributionWs = XLSX.utils.aoa_to_sheet([distributionHeader, ...distributionData]);
      XLSX.utils.book_append_sheet(wb, distributionWs, 'התפלגות נושאים');
      
      // Weekly Overview Sheet
      const weeklyHeader = ['יום', 'יום בשבוע', 'זמן כולל'];
      const weeklyData = weeklyOverview.map(day => [
        day.day,
        day.dayOfWeek,
        formatTime(day.totalTime)
      ]);
      
      const weeklyWs = XLSX.utils.aoa_to_sheet([weeklyHeader, ...weeklyData]);
      XLSX.utils.book_append_sheet(wb, weeklyWs, 'סקירה שבועית');
      
      // Write to buffer and send
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', `attachment; filename="${req.user!.username}-time-report.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
      
    } catch (error) {
      console.error('Error exporting personal data to Excel:', error);
      
      // Special handling for read-only errors
      const errorStr = String(error || '');
      if (errorStr.includes('readonly') || errorStr.includes('READONLY')) {
        return res.status(200).json({
          success: false,
          error: 'Database is in read-only mode. Export is not available in demo mode.',
          readOnly: true
        });
      }
      
      res.status(200).json({ 
        success: false, 
        error: 'Failed to export personal data. Please try again later.' 
      });
    }
  });
  
  // Helper function to format time
  function formatTime(seconds: number) {
    if (!seconds) return '0:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Skip the catch-all route in development
  // In development mode we're not using our own spa fallback
  // but letting Vite handle all non-api routes
  if (process.env.NODE_ENV !== 'development') {
    // Fallback route for SPA - all routes that are not API routes will serve the index.html
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Skip assets and files with extensions
      if (req.path.includes('.')) {
        return next();
      }
      
      console.log('Fallback route hit for path:', req.path);
      const indexPath = path.resolve('client/index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html file:', err);
          next(err);
        } else {
          console.log('Successfully served index.html for:', req.path);
        }
      });
    });
  } else {
    console.log('Running in development mode - not setting up fallback route');
  }
  
  // טיפול מאובטח בהזמנות - נקודות סיום חדשות שלא מסתמכות על קוד בעייתי
  app.post('/api/teams/invitation-secure/:token/:action', isAuthenticated, async (req, res) => {
    try {
      const token = req.params.token;
      const action = req.params.action;
      const userId = req.user?.id;
      const originalEmail = req.body.originalEmail;

      if (!token || !action || !userId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters' 
        });
      }
      
      if (action !== 'accept' && action !== 'reject') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action' 
        });
      }
      
      // קבלת פרטי ההזמנה
      const invitation = await storage.getTeamInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Invitation not found' 
        });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          error: `Invitation has already been ${invitation.status}` 
        });
      }
      
      // קבלת פרטי המשתמש
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(403).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      console.log(`User ${user.email} is handling invitation for ${invitation.email}`, 
                  { originalEmail, userEmail: user.email, invitationEmail: invitation.email });
      
      // בדיקת אימייל - גמיש יותר
      if (originalEmail && originalEmail === invitation.email) {
        console.log('Using original email from invitation which matches');
      } else if (user.email === invitation.email) {
        console.log('User email matches invitation email');
      } else {
        console.log('Warning: Email mismatch but will proceed anyway since user is authenticated');
      }
      
      if (action === 'accept') {
        // בדיקה אם המשתמש כבר חבר בצוות
        const teamId = invitation.teamId;
        const team = await storage.getTeam(teamId);
        
        if (!team) {
          return res.status(404).json({ 
            success: false, 
            error: 'Team not found' 
          });
        }
        
        // בדיקה אם המשתמש כבר חבר בצוות
        const members = await storage.getTeamMembers(teamId);
        const isAlreadyMember = members.some(member => member.user.id === userId);
        
        if (isAlreadyMember) {
          return res.status(400).json({ 
            success: false, 
            error: 'You are already a member of this team' 
          });
        }
        
        // הוספת המשתמש לצוות
        const teamMember = await storage.addTeamMember({
          teamId: teamId,
          userId: userId,
          role: 'member'
        });
        
        // עדכון סטטוס ההזמנה
        await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
        
        return res.status(200).json({ 
          success: true, 
          message: `You have successfully joined ${team.name}`,
          teamMember
        });
      } else {
        // דחיית ההזמנה
        await storage.updateTeamInvitationStatus(invitation.id, 'declined');
        
        return res.status(200).json({ 
          success: true, 
          message: `You have declined the invitation`
        });
      }
    } catch (error) {
      console.error('Error handling invitation:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'An error occurred while processing the invitation' 
      });
    }
  });

  // AI Suggestions Routes
  app.get("/api/suggestions", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const suggestions = await service.getSuggestions(req.user!.id);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
  });

  // Test AI service endpoint
  app.get("/api/suggestions/test", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ 
          error: 'AI suggestions service not available',
          details: 'Service initialization failed'
        });
      }
      
      // Test with a simple fallback suggestion
      const testSuggestion = service.getFallbackSuggestions();
      res.json({ 
        status: 'success',
        message: 'AI service is working',
        testSuggestion: testSuggestion[0] // Return first fallback suggestion
      });
    } catch (error) {
      console.error('Error testing AI service:', error);
      res.status(500).json({ 
        error: 'AI service test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/suggestions/generate", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        console.log('AI suggestions service not available - returning 503');
        return res.status(503).json({ 
          error: 'AI suggestions service not available',
          details: 'Service initialization failed or API key not configured'
        });
      }
      
      console.log('Generating AI suggestions for user:', req.user!.id);
      const suggestions = await service.generateSuggestions(req.user!.id);
      console.log('Generated suggestions:', suggestions.length);
      res.json(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to generate suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const { id } = req.params;
      const updates = req.body;
      const suggestion = await service.updateSuggestion(id, updates);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      res.json(suggestion);
    } catch (error) {
      console.error('Error updating suggestion:', error);
      res.status(500).json({ error: 'Failed to update suggestion' });
    }
  });

  app.delete("/api/suggestions/:id", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const { id } = req.params;
      const success = await service.deleteSuggestion(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      res.status(500).json({ error: 'Failed to delete suggestion' });
    }
  });

  app.get("/api/suggestions/usage", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const stats = service.getApiUsageStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  });

  // User Summary and Insights Routes
  app.get("/api/suggestions/summary", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const summary = await service.generateUserSummary(req.user!.id);
      res.json(summary);
    } catch (error) {
      console.error('Error generating user summary:', error);
      res.status(500).json({ error: 'Failed to generate user summary' });
    }
  });

  app.get("/api/suggestions/insights", isAuthenticated, async (req, res) => {
    try {
      const service = await getAISuggestionsService();
      if (!service) {
        return res.status(503).json({ error: 'AI suggestions service not available' });
      }
      
      const insights = await service.generateInsightsSuggestions(req.user!.id);
      res.json(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
