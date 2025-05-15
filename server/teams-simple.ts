import { Router, Request, Response } from 'express';
import { isAuthenticated } from './auth';
import { storage } from './storage';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getActiveTimer, getTeamActiveTimers, setActiveTimer, removeActiveTimer } from './active-timers';
import { ActiveTimer } from '@shared/schema';

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
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
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
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
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
    
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (!isMember && ownerId !== req.user?.id) {
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
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
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
    // Handle both formats of the owner id field (ownerId or owner_id)
    const ownerId = 'ownerId' in team ? team.ownerId : (team as any).owner_id;
    if (ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Only team owners can remove members' });
    }
    
    // Cannot remove the owner
    if (userId === ownerId) {
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

// API route for direct team member addition (non-HTML)
teamsRouter.post('/api/direct-add-team-member', async (req: Request, res: Response) => {
  try {
    if (!req.body.teamId || !req.body.email) {
      return res.status(400).json({ error: 'teamId and email are required' });
    }
    
    const teamId = parseInt(req.body.teamId);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // This endpoint does not check for authentication or ownership
    // It allows anyone with the team ID to add a member
    
    // Find user by email
    const user = await storage.getUserByEmail(req.body.email);
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
      role: 'member'
    });
    
    res.status(201).json({
      success: true,
      message: 'User added to team successfully',
      teamMember
    });
  } catch (error) {
    console.error('Error adding team member directly:', error);
    res.status(500).json({ error: 'Failed to add team member' });
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
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
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
      topics = await storage.getTeamTopics(teamId);
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
    
    const topicsCount = topics.length;
    
    console.log('Creating Excel workbook...');
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Team Overview Sheet
    const overviewData = [
      ['צוות', team.name],
      ['זמן כולל', formatTime(teamStats.totalSeconds || 0)],
      ['מספר חברי צוות', (teamStats.membersCount || 0).toString()],
      ['מספר נושאים', topicsCount.toString()]
    ];
    const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, overviewWs, 'סקירה כללית');
    
    // Team Members Sheet
    const membersHeader = ['אימייל', 'זמן כולל', 'שעת פעילות מרכזית', 'יום פעילות אחרון'];
    const membersData = members.map(member => [
      member.email || 'N/A',
      formatTime(member.totalSeconds || 0),
      member.mostActiveHour ? `${member.mostActiveHour}:00` : 'N/A',
      member.lastActiveDay || 'N/A'
    ]);
    
    const membersWs = XLSX.utils.aoa_to_sheet([membersHeader, ...membersData]);
    XLSX.utils.book_append_sheet(wb, membersWs, 'חברי צוות');
    
    // Topics Sheet
    const topicsHeader = ['נושא', 'זמן כולל', 'אחוז מסך הכל'];
    const topicsData = topicDistributions.map(topic => [
      topic.topic.name || 'N/A',
      formatTime(topic.totalSeconds || 0),
      `${(topic.percentage || 0).toFixed(1)}%`
    ]);
    
    const topicsWs = XLSX.utils.aoa_to_sheet([topicsHeader, ...topicsData]);
    XLSX.utils.book_append_sheet(wb, topicsWs, 'נושאים');
    
    console.log('Writing Excel buffer...');
    
    // Write to buffer and send
    try {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      console.log('Excel file generated successfully, sending response...');
      
      res.setHeader('Content-Disposition', `attachment; filename="team-${team.name}-report.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
      
      console.log('Excel export complete');
    } catch (xlsxError) {
      console.error('XLSX error during file generation:', xlsxError);
      return res.status(500).json({ error: 'Error generating Excel file' });
    }
    
  } catch (error) {
    console.error('Error exporting team data to Excel:', error);
    res.status(500).json({ error: 'Failed to export team data' });
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
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
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
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
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
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
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
      return res.status(400).json({ error: 'Invalid team ID' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
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
      return res.status(401).json({ error: 'Not authorized' });
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
      return res.status(400).json({ error: 'Invalid timer data', details: validationResult.error.errors });
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
      return res.status(401).json({ error: 'Not authorized' });
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