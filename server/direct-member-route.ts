import { Request, Response, Router } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './auth';
import { z } from 'zod';

// Create router for direct member addition
const directMemberRouter = Router();

// Add a team member directly with a simplified endpoint - just team ID and email in the URL parameters
directMemberRouter.get('/direct-add/:teamId/:email', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const email = req.params.email;
    const userId = req.user?.id;
    
    // Input validation
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }

    // Validate email format
    const emailSchema = z.string().email();
    try {
      emailSchema.parse(email);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if team exists
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user is the team owner
    if (team.ownerId !== userId) {
      return res.status(403).json({ error: 'Only team owners can add members directly' });
    }
    
    // Check if user exists
    const existingUser = await storage.getUserByEmail(email);
    if (!existingUser) {
      return res.status(404).json({ error: 'User with this email does not exist in the system' });
    }
    
    // If user exists, check if already a member
    const members = await storage.getTeamMembers(teamId);
    const isAlreadyMember = members.some(member => member.userId === existingUser.id);
    
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }
    
    // Add user to the team
    const teamMember = await storage.addTeamMember({
      teamId: teamId,
      userId: existingUser.id,
      role: 'member'
    });
    
    // Send success HTML page
    const successHtml = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הוספת משתמש בהצלחה</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
            text-align: center;
          }
          .success-container {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          .success-icon {
            color: #10b981;
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #10b981;
            margin-bottom: 1rem;
          }
          p {
            color: #4b5563;
            margin-bottom: 1.5rem;
          }
          .close-button {
            background-color: #10b981;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
          }
          .close-button:hover {
            background-color: #059669;
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✓</div>
          <h1>הוספת משתמש בהצלחה!</h1>
          <p>המשתמש <strong>${email}</strong> נוסף בהצלחה לצוות <strong>${team.name}</strong>.</p>
          <button class="close-button" onclick="window.close()">סגור</button>
          <script>
            // Automatically redirect after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(successHtml);
    
  } catch (error) {
    console.error('Error adding team member directly:', error);
    res.status(500).json({ error: 'Server error adding team member' });
  }
});

export { directMemberRouter };