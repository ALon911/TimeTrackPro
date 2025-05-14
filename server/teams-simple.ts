import { Router, Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { storage } from './storage';
import { z } from 'zod';

const teamsRouter = Router();

// Get all teams for the authenticated user
teamsRouter.get('/api/teams', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    const teams = await storage.getTeams(req.user.id);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get a specific team
teamsRouter.get('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Create a new team
teamsRouter.post('/api/teams', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    const schema = z.object({
      name: z.string().min(1).max(100),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid team data', details: validationResult.error.errors });
    }
    
    const team = await storage.createTeam({
      name: validationResult.data.name,
      ownerId: req.user.id,
    });
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update a team
teamsRouter.put('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (team.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'You do not have permission to update this team' });
    }
    
    const schema = z.object({
      name: z.string().min(1).max(100),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid team data', details: validationResult.error.errors });
    }
    
    const updatedTeam = await storage.updateTeam(teamId, { name: validationResult.data.name });
    
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete a team
teamsRouter.delete('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (team.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'You do not have permission to delete this team' });
    }
    
    const success = await storage.deleteTeam(teamId);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete team' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Get team members
teamsRouter.get('/api/teams/:id/members', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user is a member of the team
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    if (!isMember && team.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'You do not have permission to view this team\'s members' });
    }
    
    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Add a direct member to a team without invitation
teamsRouter.post('/api/teams/:id/direct-member', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Only team owner can add members directly
    if (team.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Only team owners can add members directly' });
    }
    
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['member', 'admin']).default('member'),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid member data', details: validationResult.error.errors });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(validationResult.data.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email' });
    }
    
    // Check if user is already a team member
    const teamMembers = await storage.getTeamMembers(teamId);
    const existingMember = teamMembers.find(member => member.userId === user.id);
    
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }
    
    // Add user to team
    const teamMember = await storage.addTeamMember({
      teamId,
      userId: user.id,
      role: validationResult.data.role
    });
    
    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Error adding team member directly:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

// Remove a team member
teamsRouter.delete('/api/teams/:teamId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(teamId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid team ID or user ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Only the team owner can remove members
    if (team.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Only team owners can remove members' });
    }
    
    // Cannot remove the owner
    if (userId === team.ownerId) {
      return res.status(400).json({ error: 'Cannot remove the team owner' });
    }
    
    const success = await storage.removeTeamMember(teamId, userId);
    if (!success) {
      return res.status(500).json({ error: 'Failed to remove team member' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Simple HTML route for direct member addition
teamsRouter.get('/direct-add/:teamId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    if (isNaN(teamId)) {
      return res.status(400).send('Invalid team ID');
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    
    // Only team owner can add members
    if (team.ownerId !== req.user?.id) {
      return res.status(403).send('Only team owners can add members');
    }
    
    // Return a simple HTML form for adding a member
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
            line-height: 1.6;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
            text-align: center;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input[type="email"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            direction: ltr;
          }
          button {
            display: block;
            width: 100%;
            padding: 10px;
            background-color: #e11d48;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
          }
          button:hover {
            background-color: #be123c;
          }
          .error {
            color: #e11d48;
            margin-top: 10px;
            display: none;
          }
          .success {
            color: #10b981;
            margin-top: 10px;
            display: none;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>הוספת משתמש לצוות ${team.name}</h1>
        <div id="form">
          <div class="form-group">
            <label for="email">כתובת אימייל של המשתמש:</label>
            <input type="email" id="email" required placeholder="הזן כתובת אימייל" />
          </div>
          <button id="submit-btn">הוסף לצוות</button>
          <div id="error-message" class="error"></div>
          <div id="success-message" class="success"></div>
        </div>
        
        <script>
          document.getElementById('submit-btn').addEventListener('click', async () => {
            const email = document.getElementById('email').value;
            const errorElement = document.getElementById('error-message');
            const successElement = document.getElementById('success-message');
            
            errorElement.style.display = 'none';
            successElement.style.display = 'none';
            
            if (!email) {
              errorElement.textContent = 'יש להזין כתובת אימייל';
              errorElement.style.display = 'block';
              return;
            }
            
            try {
              const response = await fetch('/api/teams/${teamId}/direct-member', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, role: 'member' }),
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                errorElement.textContent = data.error || 'שגיאה בהוספת משתמש';
                errorElement.style.display = 'block';
                return;
              }
              
              document.getElementById('form').innerHTML = '<div class="success" style="display: block;"><h2>המשתמש נוסף בהצלחה!</h2><p>חלון זה ייסגר אוטומטית תוך 3 שניות</p></div>';
              
              // Auto close after 3 seconds
              setTimeout(() => {
                window.close();
              }, 3000);
              
            } catch (error) {
              errorElement.textContent = 'שגיאה בתקשורת עם השרת';
              errorElement.style.display = 'block';
            }
          });
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error rendering direct add form:', error);
    res.status(500).send('Internal Server Error');
  }
});

export { teamsRouter };