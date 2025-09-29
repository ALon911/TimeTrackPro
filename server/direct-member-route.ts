import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { emailService } from "./email-service";
import { appBaseUrl } from "./config";
import crypto from 'crypto';

export const directMemberRouter = Router();

// API route to send team invitation
directMemberRouter.post('/api/teams/:teamId/invitations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { email } = req.body;
    
    if (isNaN(teamId) || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`===== Processing invitation request =====`);
    console.log(`Team ID: ${teamId}, Email: ${email}`);
    
    // Check if team exists
    const team = await storage.getTeam(teamId);
    if (!team) {
      console.log(`Team not found with ID: ${teamId}`);
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user is team owner
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      console.log(`User ${req.user?.id} is not the owner of team ${teamId}`);
      return res.status(403).json({ error: 'Only team owners can add members directly' });
    }
    
    // Get current user (inviter) details
    const inviter = await storage.getUser(req.user.id);
    if (!inviter) {
      console.log(`Inviter not found with ID: ${req.user.id}`);
      return res.status(500).json({ error: 'Inviter user not found' });
    }
    
    // Find user by email
    const userToAdd = await storage.getUserByEmail(email);
    
    // Check if user is already a member if they exist
    if (userToAdd) {
      const teamMembers = await storage.getTeamMembers(teamId);
      const isAlreadyMember = teamMembers.some(member => member.userId === userToAdd.id);
      
      if (isAlreadyMember) {
        console.log(`User ${userToAdd.id} is already a member of team ${teamId}`);
        return res.status(400).json({ error: 'User is already a member of this team' });
      }
    }
    
    // Generate a unique token for this invitation
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`Generated invitation token: ${token.substring(0, 8)}...`);
    
    // Create an invitation
    const invitation = await storage.createTeamInvitation({
      teamId,
      email,
      status: 'pending',
      token,
      invitedBy: req.user.id
    });
    
    console.log(`Invitation created with ID: ${invitation.id}`);
    
    // Send email invitation
    console.log(`Checking email service status: ${emailService.isReady()}`);
    
    let emailSent = false;
    
    // Generate the invitation link with the app's base URL - הוספת לוגיקה מורחבת לקישורים אחידים
    const appUrl = appBaseUrl || 'http://localhost:5000'; // Default if no URL specified
    
    // שימוש בנתיב אחיד בכל המקומות
    const inviteLink = `${appUrl}/invitation/${token}`;
    console.log(`Generated invitation link: ${inviteLink}`);
    
    // לוג לדיבאג עם פירוט כל סוגי הקישורים האפשריים
    console.log('Available invitation links:', {
      preferredLink: `${appUrl}/invitation/${token}`,
      compatLink1: `${appUrl}/invitations/${token}`,
      compatLink2: `${appUrl}/accept-invitation/${token}`
    });
    
    if (emailService.isReady()) {
      if (userToAdd) {
        // Send email to existing user
        console.log(`Sending invitation email to existing user: ${email}`);
        emailSent = await emailService.sendTeamInvitation(
          invitation,
          inviter,
          team,
          inviteLink
        );
      } else {
        // Send email with registration link to new user
        console.log(`Sending invitation email to new user: ${email}`);
        const registerLink = `${appBaseUrl}/register?invite=${token}`;
        emailSent = await emailService.sendInvitationWithRegistration(
          invitation,
          inviter,
          team,
          registerLink
        );
      }
      
      console.log(`Email sending result: ${emailSent ? 'success' : 'failed'}`);
    } else {
      console.log(`Email service is not configured properly`);
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Member invitation sent successfully',
      emailSent
    });
    
  } catch (error) {
    console.error('Error sending team invitation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to open the add member popup in a new window
directMemberRouter.get('/add-direct-member/:teamId/:email', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { teamId, email } = req.params;
    
    if (!teamId) {
      return res.status(400).send('Missing team ID');
    }
    
    // Check if team exists
    const team = await storage.getTeam(parseInt(teamId));
    if (!team) {
      return res.status(404).send('Team not found');
    }
    
    // Check if user is team owner
    if (team.ownerId !== req.user?.id) {
      return res.status(403).send('Only team owners can add members directly');
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הוספת משתמש לצוות ${team.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            direction: rtl;
          }
          h1 {
            margin-bottom: 20px;
          }
          .form-group {
            margin-bottom: 15px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          button {
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
          }
          .primary {
            background-color: #e11d48;
            color: white;
          }
          .secondary {
            background-color: #f3f4f6;
            color: #333;
            border: 1px solid #ddd;
          }
          .error {
            color: red;
            margin-top: 10px;
            padding: 10px;
            background-color: #fee2e2;
            border-radius: 4px;
            display: none;
          }
          .success {
            color: green;
            margin-top: 10px;
            padding: 10px;
            background-color: #d1fae5;
            border-radius: 4px;
            display: none;
          }
        </style>
      </head>
      <body>
        <h1>הוספת משתמש לצוות ${team.name}</h1>
        <div class="form-group">
          <label for="email">אימייל:</label>
          <input type="email" id="email" value="${email || ''}" placeholder="הזן אימייל של משתמש קיים">
        </div>
        <div class="buttons">
          <button id="addBtn" class="primary">הוסף משתמש</button>
          <button id="closeBtn" class="secondary">סגור</button>
        </div>
        <div id="errorMsg" class="error"></div>
        <div id="successMsg" class="success"></div>
        
        <script>
          document.getElementById('addBtn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const errorMsg = document.getElementById('errorMsg');
            const successMsg = document.getElementById('successMsg');
            
            errorMsg.style.display = 'none';
            
            if (!email) {
              errorMsg.textContent = 'יש להזין אימייל';
              errorMsg.style.display = 'block';
              return;
            }
            
            try {
              const response = await fetch('/api/direct-add-team-member', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  teamId: ${teamId},
                  email
                })
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                errorMsg.textContent = data.error || 'שגיאה בהוספת המשתמש';
                errorMsg.style.display = 'block';
                return;
              }
              
              successMsg.textContent = 'המשתמש נוסף בהצלחה! החלון ייסגר אוטומטית תוך 3 שניות.';
              successMsg.style.display = 'block';
              
              setTimeout(() => {
                window.close();
              }, 3000);
              
            } catch (error) {
              errorMsg.textContent = 'שגיאה בהוספת המשתמש';
              errorMsg.style.display = 'block';
            }
          });
          
          document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
          });
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    console.error('Error rendering direct member add page:', error);
    res.status(500).send('Internal server error');
  }
});