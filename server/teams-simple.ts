import { Router, Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { storage } from './storage';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getActiveTimer, getTeamActiveTimers, setActiveTimer, removeActiveTimer, updateTimerState, getTimerWithElapsedTime, cleanupExpiredTimers } from './active-timers';

const teamsRouter = Router();

// Get all teams for the authenticated user (with crew isolation)
teamsRouter.get('/api/teams', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    // Get teams where user is a member (crew isolation by default)
    const teams = await storage.getTeams(req.user.id);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'נכשל בטעינת הצוותים' });
  }
});

// Get all teams including cross-crew access (for admin purposes)
teamsRouter.get('/api/teams/all', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    // Get all teams including those with cross-crew access
    const teams = await storage.getAllTeams(req.user.id);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching all teams:', error);
    res.status(500).json({ error: 'נכשל בטעינת כל הצוותים' });
  }
});

// Timer synchronization endpoints
// Get user's active timer
teamsRouter.get('/api/timer/active', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    // Clean up expired timers first
    cleanupExpiredTimers();
    
    const timer = getTimerWithElapsedTime(req.user.id);
    res.json(timer || null);
  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({ error: 'נכשל בטעינת הטיימר הפעיל' });
  }
});

// Start/Update timer
teamsRouter.post('/api/timer/start', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    const schema = z.object({
      topicId: z.number().optional(),
      description: z.string().optional(),
      duration: z.number().optional(), // in seconds, for countdown timers
      isCountDown: z.boolean().default(false)
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני טיימר לא תקינים', details: validationResult.error.errors });
    }
    
    // Validate countdown timer duration
    if (validationResult.data.isCountDown && validationResult.data.duration !== undefined) {
      if (validationResult.data.duration <= 0) {
        return res.status(400).json({ error: 'משך זמן הטיימר חייב להיות גדול מ-0' });
      }
    }
    
    const timerData = {
      userId: req.user.id,
      topicId: validationResult.data.topicId || null,
      description: validationResult.data.description || null,
      startTime: new Date().toISOString(),
      duration: validationResult.data.duration || null,
      isCountDown: validationResult.data.isCountDown,
      isRunning: true,
      isPaused: false
    };
    
    setActiveTimer(req.user.id, timerData);
    res.json(timerData);
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'נכשל בהתחלת הטיימר' });
  }
});

// Update timer state (pause/resume)
teamsRouter.patch('/api/timer/update', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    const schema = z.object({
      isRunning: z.boolean().optional(),
      isPaused: z.boolean().optional(),
      description: z.string().optional(),
      topicId: z.number().optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני עדכון טיימר לא תקינים', details: validationResult.error.errors });
    }
    
    updateTimerState(req.user.id, validationResult.data);
    const updatedTimer = getTimerWithElapsedTime(req.user.id);
    res.json(updatedTimer);
  } catch (error) {
    console.error('Error updating timer:', error);
    res.status(500).json({ error: 'נכשל בעדכון הטיימר' });
  }
});

// Stop timer
teamsRouter.post('/api/timer/stop', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    removeActiveTimer(req.user.id);
    res.json({ success: true, message: 'Timer stopped' });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'נכשל בעצירת הטיימר' });
  }
});

// Get a specific team
teamsRouter.get('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'נכשל בטעינת הצוות' });
  }
});

// Create a new team
teamsRouter.post('/api/teams', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    const schema = z.object({
      name: z.string().min(1).max(100),
      visibility: z.enum(['private', 'public']).default('private'),
      allowCrossCrewAccess: z.boolean().default(false),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני צוות לא תקינים', details: validationResult.error.errors });
    }
    
    const team = await storage.createTeam({
      name: validationResult.data.name,
      ownerId: req.user.id,
      visibility: validationResult.data.visibility,
      allowCrossCrewAccess: validationResult.data.allowCrossCrewAccess,
    });
    
    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'נכשל ביצירת הצוות' });
  }
});

// Get team admins
teamsRouter.get('/api/teams/:id/admins', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const admins = await storage.getTeamAdmins(teamId);
    res.json(admins);
  } catch (error) {
    console.error('Error fetching team admins:', error);
    res.status(500).json({ error: 'נכשל בטעינת מנהלי הצוות' });
  }
});

// Update team crew settings
teamsRouter.patch('/api/teams/:id/crew-settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const schema = z.object({
      visibility: z.enum(['private', 'public']).optional(),
      allowCrossCrewAccess: z.boolean().optional(),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'הגדרות צוות לא תקינות', details: validationResult.error.errors });
    }
    
    // Update team settings
    const updateStmt = storage.db.prepare(`
      UPDATE teams 
      SET visibility = COALESCE(?, visibility), 
          allow_cross_crew_access = COALESCE(?, allow_cross_crew_access)
      WHERE id = ?
    `);
    
    updateStmt.run(
      validationResult.data.visibility,
      validationResult.data.allowCrossCrewAccess ? 1 : 0,
      teamId
    );
    
    const updatedTeam = await storage.getTeam(teamId);
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating crew settings:', error);
    res.status(500).json({ error: 'נכשל בעדכון הגדרות הצוות' });
  }
});

// Update a team
teamsRouter.put('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'אין לך הרשאה לעדכן צוות זה' });
    }
    
    const schema = z.object({
      name: z.string().min(1).max(100),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני צוות לא תקינים', details: validationResult.error.errors });
    }
    
    const updatedTeam = await storage.updateTeam(teamId, { name: validationResult.data.name });
    
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'נכשל בעדכון הצוות' });
  }
});

// Delete a team
teamsRouter.delete('/api/teams/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'אין לך הרשאה למחוק צוות זה' });
    }
    
    const success = await storage.deleteTeam(teamId);
    if (!success) {
      return res.status(500).json({ error: 'נכשל במחיקת הצוות' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'נכשל במחיקת הצוות' });
  }
});

// Get team members
teamsRouter.get('/api/teams/:id/members', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Check if user is a member of the team
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (!isMember && ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'אין לך הרשאה לצפות בחברי צוות זה' });
    }
    
    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'נכשל בטעינת חברי הצוות' });
  }
});

// Add a direct member to a team without invitation
teamsRouter.post('/api/teams/:id/direct-member', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Only team owner can add members directly
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'רק מנהלי צוות יכולים להוסיף חברים ישירות' });
    }
    
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['member', 'admin']).default('member'),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני חבר לא תקינים', details: validationResult.error.errors });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(validationResult.data.email);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא עם כתובת דוא״ל זו' });
    }
    
    // Check if user is already a team member
    const teamMembers = await storage.getTeamMembers(teamId);
    const existingMember = teamMembers.find(member => member.userId === user.id);
    
    if (existingMember) {
      return res.status(400).json({ error: 'המשתמש כבר חבר בצוות זה' });
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
    res.status(500).json({ error: 'נכשל בהוספת חבר לצוות' });
  }
});

// Remove a team member
teamsRouter.delete('/api/teams/:teamId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(teamId) || isNaN(userId)) {
      return res.status(400).json({ error: 'מזהה צוות או משתמש לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Only the team owner can remove members
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'רק מנהלי צוות יכולים להסיר חברים' });
    }
    
    // Cannot remove the owner
    if (userId === ownerId) {
      return res.status(400).json({ error: 'לא ניתן להסיר את מנהל הצוות' });
    }
    
    try {
      const success = await storage.removeTeamMember(teamId, userId);
      if (!success) {
        return res.status(500).json({ error: 'נכשל בהסרת חבר הצוות' });
      }
      
      res.status(204).end();
    } catch (adminError: any) {
      if (adminError.message.includes('last admin')) {
        return res.status(400).json({ error: adminError.message });
      }
      throw adminError;
    }
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'נכשל בהסרת חבר הצוות' });
  }
});

// Update team member role
teamsRouter.patch('/api/teams/:teamId/members/:userId/role', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(teamId) || isNaN(userId)) {
      return res.status(400).json({ error: 'מזהה צוות או משתמש לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Only the team owner can update member roles
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'רק מנהלי צוות יכולים לעדכן תפקידי חברים' });
    }
    
    const schema = z.object({
      role: z.enum(['member', 'admin']),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני תפקיד לא תקינים', details: validationResult.error.errors });
    }
    
    try {
      const updatedMember = await storage.updateTeamMemberRole(teamId, userId, validationResult.data.role);
      if (!updatedMember) {
        return res.status(404).json({ error: 'חבר צוות לא נמצא' });
      }
      
      res.json(updatedMember);
    } catch (adminError: any) {
      if (adminError.message.includes('last admin')) {
        return res.status(400).json({ error: adminError.message });
      }
      throw adminError;
    }
  } catch (error) {
    console.error('Error updating team member role:', error);
    res.status(500).json({ error: 'נכשל בעדכון תפקיד חבר הצוות' });
  }
});

// API route for direct team member addition (non-HTML)
teamsRouter.post('/api/direct-add-team-member', async (req: Request, res: Response) => {
  try {
    if (!req.body.teamId || !req.body.email) {
      return res.status(400).json({ error: 'מזהה צוות וכתובת דוא״ל נדרשים' });
    }
    
    const teamId = parseInt(req.body.teamId);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // This endpoint does not check for authentication or ownership
    // It allows anyone with the team ID to add a member
    
    // Find user by email
    const user = await storage.getUserByEmail(req.body.email);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא עם כתובת דוא״ל זו' });
    }
    
    // Check if user is already a team member
    const teamMembers = await storage.getTeamMembers(teamId);
    const existingMember = teamMembers.find(member => member.userId === user.id);
    
    if (existingMember) {
      return res.status(400).json({ error: 'המשתמש כבר חבר בצוות זה' });
    }
    
    // Add user to team
    const teamMember = await storage.addTeamMember({
      teamId,
      userId: user.id,
      role: 'member'
    });
    
    res.status(201).json({
      success: true,
      message: 'User added to team successfully',
      teamMember
    });
  } catch (error) {
    console.error('Error adding team member directly:', error);
    res.status(500).json({ error: 'נכשל בהוספת חבר לצוות' });
  }
});

// Serve the standalone HTML page for adding team members directly
teamsRouter.get('/teams/:teamId/add-member', async (req: Request, res: Response) => {
  try {
    // Read the HTML file
    const htmlFilePath = path.join(__dirname, 'add-member.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    
    // No authentication check needed as authentication happens at the API level
    // when actually adding a member
    
    res.send(htmlContent);
  } catch (error) {
    console.error('Error serving add member HTML:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Export time entries to Excel for a specific team
teamsRouter.get('/api/teams/:id/export', isAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('Starting Excel export for team');
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Check if user is a member of the team
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (!isMember && ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'You do not have permission to export this team\'s data' });
    }
    
    console.log('Gathering team data for export...');
    
    // Get team member activity and topic distribution
    let members;
    let topicDistributions;
    let teamStats;
    let topics;
    
    try {
      members = await storage.getTeamMemberActivity(teamId);
      topicDistributions = await storage.getTeamTopicDistribution(teamId);
      teamStats = await storage.getTeamStats(teamId);
      // המשך עם שאר הנתונים אפילו אם אין אפשרות לקבל את נושאי הצוות
      try {
        topics = await storage.getTeamTopics(teamId);
        // אם אין נושאים לצוות, קבל את כל הנושאים של בעל הצוות במקום
        if (!topics || topics.length === 0) {
          console.warn("No team topics found, using owner's topics instead");
          topics = await storage.getTopics(ownerId);
        }
      } catch (error) {
        console.warn("Failed to get team topics, using all topics instead:", error);
        // בגלל שחסר עמודת team_id בחלק מהמקרים, נשתמש בכל הנושאים
        const allTopics = await storage.getTopics(ownerId);
        topics = allTopics;
      }
      
      // קבל נתונים נוספים עבור כל משתמש בצוות
      const membersWithDetails = await Promise.all((members || []).map(async (member) => {
        try {
          // נסה לקבל סטטיסטיקות שבועיות למשתמש
          const weekly = await storage.getWeeklyStats(member.userId);
          // קבל את הנושא המועדף על המשתמש
          const mostTracked = await storage.getMostTrackedTopic(member.userId);
          
          return {
            ...member,
            weeklyTotal: weekly?.total || 0,
            weeklyChange: weekly?.percentChange || 0,
            favoriteTopicName: mostTracked?.topic?.name || '',
            favoriteTopicTime: mostTracked?.totalTime || 0
          };
        } catch (error) {
          console.warn(`Failed to get details for user ${member.userId}:`, error);
          return member;
        }
      }));
      
      // החלף את רשימת החברים המקורית עם הרשימה המפורטת יותר
      members = membersWithDetails;
    } catch (dataError: any) {
      console.error('Error fetching team data for Excel export:', dataError);
      
      // בדיקה אם הבעיה קשורה לדאטאבייס במצב קריאה בלבד 
      const isReadOnlyError = String(dataError).includes('readonly') || 
                             String(dataError).includes('READONLY') || 
                             String(dataError).includes('SQLITE_READONLY');
      
      if (isReadOnlyError) {
        return res.status(200).json({ 
          success: false, 
          error: 'Database is in read-only mode. Export is not available in demo mode.',
          readOnly: true
        });
      }
      
      throw dataError; // זרוק את השגיאה המקורית אם לא קשורה למצב קריאה בלבד
    }
    
    const topicsCount = topics?.length || 0;
    
    console.log('Creating Excel workbook...');
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Team Overview Sheet
    const overviewData = [
      ['צוות', team.name || 'ללא שם'],
      ['זמן כולל', formatTime(teamStats?.totalSeconds || 0)],
      ['מספר חברי צוות', (teamStats?.membersCount || 0).toString()],
      ['מספר נושאים', topicsCount.toString()]
    ];
    const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, overviewWs, 'סקירה כללית');
    
    // Team Members Sheet - הוספת עמודות נוספות עם מידע סטטיסטי על המשתמש
    const membersHeader = [
      'אימייל', 
      'זמן כולל', 
      'זמן שבועי',
      'שינוי שבועי %',
      'נושא מועדף',
      'זמן בנושא מועדף',
      'שעת פעילות מרכזית', 
      'יום פעילות אחרון'
    ];
    
    const membersData = (members || []).map(member => [
      member?.email || 'N/A',
      formatTime(member?.totalTime || member?.totalSeconds || 0),
      formatTime(member?.weeklyTotal || 0),
      `${((member?.weeklyChange || 0) * 100).toFixed(1)}%`,
      member?.favoriteTopicName || 'אין נתונים',
      formatTime(member?.favoriteTopicTime || 0),
      member?.mostActiveHour ? `${member.mostActiveHour}:00` : 'N/A',
      member?.lastActiveDay || 'N/A'
    ]);
    
    const membersWs = XLSX.utils.aoa_to_sheet([membersHeader, ...membersData]);
    XLSX.utils.book_append_sheet(wb, membersWs, 'חברי צוות');
    
    // Topics Sheet - מידע מפורט יותר על הנושאים
    const topicsHeader = [
      'נושא', 
      'זמן כולל', 
      'אחוז מסך הכל', 
      'צבע', 
      'מספר רשומות',
      'משתמשים שמשתמשים בנושא'
    ];
    
    // בניית צד הנושאים עם יותר מידע על פי הבקשה
    const topicDistributionsMap = new Map();
    (topicDistributions || []).forEach(td => {
      if (td?.topic?.name) {
        topicDistributionsMap.set(td.topic.name, td);
      }
    });
    
    // הוספת מידע שימושי לכל נושא
    const topicsDataEnhanced = (topics || []).map(topic => {
      const td = topicDistributionsMap.get(topic.name) || {};
      const topicName = topic.name || 'N/A';
      
      // מוסיף גם מספר הרשומות לכל נושא אם המידע הזה חסר
      if (!td.entryCount) {
        td.entryCount = 0;
        // לוגיקה מורחבת לחישוב מספר רשומות יכולה להוסף כאן, אך זה ידרוש שאילתות נוספות
      }
      
      // נמצא כמה משתמשים משתמשים בנושא זה
      const usersWithThisTopic = new Set();
      (members || []).forEach(member => {
        if (member.favoriteTopicName === topicName) {
          usersWithThisTopic.add(member.email);
        }
      });
      
      return [
        topicName,
        formatTime(td?.totalTime || td?.totalSeconds || 0),
        `${(td?.percentage || 0).toFixed(1)}%`,
        topic.color || '#cccccc',
        (td?.entryCount || 0).toString(),
        usersWithThisTopic.size.toString()
      ];
    });
    
    const topicsWs = XLSX.utils.aoa_to_sheet([topicsHeader, ...topicsDataEnhanced]);
    XLSX.utils.book_append_sheet(wb, topicsWs, 'נושאים');
    
    console.log('Writing Excel buffer...');
    
    // Write to buffer and send
    try {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      console.log('Excel file generated successfully, sending response...');
      
      // מנקה את שם הקובץ לגמרי מתווים עבריים שגורמים לבעיות 
      const fileName = `team-report.xlsx`;
      
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
      
      console.log('Excel export complete');
    } catch (xlsxError) {
      console.error('XLSX error during file generation:', xlsxError);
      return res.status(200).json({ 
        success: false, 
        error: 'Error generating Excel file. Please try again later.'
      });
    }
    
  } catch (error) {
    console.error('Error exporting team data to Excel:', error);
    
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
      error: 'Failed to export team data. Please try again later.' 
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

// Get team statistics
teamsRouter.get('/api/teams/:id/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Get team members and always allow access for testing
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Get owner ID (supports both formats)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    
    console.log('Team access check:', {
      userId: req.user?.id, 
      teamId,
      isMember,
      ownerId,
      isOwner: ownerId === req.user?.id
    });
    
    const teamStats = await storage.getTeamStats(teamId);
    res.json(teamStats);
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    res.status(500).json({ error: 'Failed to fetch team statistics' });
  }
});

// Get team member activity
teamsRouter.get('/api/teams/:id/stats/member-activity', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Get team members and always allow access for testing
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Get owner ID (supports both formats)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    
    console.log('Team access check (member activity):', {
      userId: req.user?.id, 
      teamId,
      isMember,
      ownerId,
      isOwner: ownerId === req.user?.id
    });
    
    const memberActivity = await storage.getTeamMemberActivity(teamId);
    res.json(memberActivity);
  } catch (error) {
    console.error('Error fetching team member activity:', error);
    res.status(500).json({ error: 'Failed to fetch team member activity' });
  }
});

// Get team topic distribution
teamsRouter.get('/api/teams/:id/stats/topic-distribution', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Get team members and always allow access for testing
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Get owner ID (supports both formats)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    
    console.log('Team access check (topic distribution):', {
      userId: req.user?.id, 
      teamId,
      isMember,
      ownerId,
      isOwner: ownerId === req.user?.id
    });
    
    const topicDistribution = await storage.getTeamTopicDistribution(teamId);
    
    // Filter out topics with zero seconds (extra safeguard)
    const filteredTopicDistribution = topicDistribution.filter(topic => topic.totalSeconds > 0);
    
    // If we have topics with time, recalculate percentages
    if (filteredTopicDistribution.length > 0) {
      const totalTime = filteredTopicDistribution.reduce((sum, topic) => sum + topic.totalSeconds, 0);
      
      // Recalculate percentages based on filtered list
      filteredTopicDistribution.forEach(topic => {
        topic.percentage = (topic.totalSeconds / totalTime) * 100;
      });
    }
    
    res.json(filteredTopicDistribution);
  } catch (error) {
    console.error('Error fetching team topic distribution:', error);
    res.status(500).json({ error: 'Failed to fetch team topic distribution' });
  }
});

// Get active timers for a team
teamsRouter.get('/api/teams/:id/active-timers', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'מזהה צוות לא תקין' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'צוות לא נמצא' });
    }
    
    // Check if user is a member of the team
    const teamMembers = await storage.getTeamMembers(teamId);
    const isMember = teamMembers.some(member => member.userId === req.user?.id);
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (!isMember && ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'You do not have permission to view this team\'s timers' });
    }
    
    // Get user IDs of all team members
    const memberUserIds = teamMembers.map(member => member.userId);
    
    // Get active timers for all team members
    const activeTimers = getTeamActiveTimers(memberUserIds);
    
    res.json(activeTimers);
  } catch (error) {
    console.error('Error fetching team active timers:', error);
    res.status(500).json({ error: 'Failed to fetch team active timers' });
  }
});

// Update my active timer for team sharing
teamsRouter.post('/api/teams/share-timer', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    const schema = z.object({
      topicId: z.number(),
      topicName: z.string(),
      topicColor: z.string(),
      description: z.string().optional().default(''),
      startTime: z.string(),
      estimatedEndTime: z.string().nullable().optional(),
      isPaused: z.boolean().optional().default(false),
      pausedAt: z.string().nullable().optional(),
      duration: z.number().nullable().optional(),
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'נתוני טיימר לא תקינים', details: validationResult.error.errors });
    }
    
    const timerData = validationResult.data;
    
    // Create active timer object
    const activeTimer: ActiveTimer = {
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email,
      topicId: timerData.topicId,
      topicName: timerData.topicName,
      topicColor: timerData.topicColor,
      description: timerData.description || '',
      startTime: timerData.startTime,
      estimatedEndTime: timerData.estimatedEndTime,
      isPaused: timerData.isPaused || false,
      pausedAt: timerData.pausedAt,
      duration: timerData.duration,
    };
    
    // Update the active timer
    setActiveTimer(req.user.id, activeTimer);
    
    res.status(200).json({ message: 'Timer shared successfully' });
  } catch (error) {
    console.error('Error sharing timer:', error);
    res.status(500).json({ error: 'Failed to share timer' });
  }
});

// Stop sharing my timer
teamsRouter.post('/api/teams/stop-share-timer', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    // Remove the active timer
    removeActiveTimer(req.user.id);
    
    res.status(200).json({ message: 'Timer sharing stopped' });
  } catch (error) {
    console.error('Error stopping timer sharing:', error);
    res.status(500).json({ error: 'Failed to stop timer sharing' });
  }
});

export { teamsRouter };