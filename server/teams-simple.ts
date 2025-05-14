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
    
    // Get team member activity and topic distribution
    const members = await storage.getTeamMemberActivity(teamId);
    const topics = await storage.getTeamTopicDistribution(teamId);
    const teamStats = await storage.getTeamStats(teamId);
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Team Overview Sheet
    const overviewData = [
      ['צוות', team.name],
      ['זמן כולל', formatTime(teamStats.totalTime)],
      ['מספר חברי צוות', teamStats.memberCount.toString()],
      ['מספר נושאים', teamStats.topicCount.toString()]
    ];
    const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, overviewWs, 'סקירה כללית');
    
    // Team Members Sheet
    const membersHeader = ['שם משתמש', 'אימייל', 'זמן כולל', 'מספר משימות'];
    const membersData = members.map(member => [
      member.username,
      member.email,
      formatTime(member.totalTime),
      member.taskCount.toString()
    ]);
    
    const membersWs = XLSX.utils.aoa_to_sheet([membersHeader, ...membersData]);
    XLSX.utils.book_append_sheet(wb, membersWs, 'חברי צוות');
    
    // Topics Sheet
    const topicsHeader = ['נושא', 'זמן כולל', 'אחוז מסך הכל'];
    const topicsData = topics.map(topic => [
      topic.topic.name,
      formatTime(topic.totalTime),
      `${topic.percentage.toFixed(1)}%`
    ]);
    
    const topicsWs = XLSX.utils.aoa_to_sheet([topicsHeader, ...topicsData]);
    XLSX.utils.book_append_sheet(wb, topicsWs, 'נושאים');
    
    // Write to buffer and send
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename="team-${team.name}-report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
    
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

export { teamsRouter };