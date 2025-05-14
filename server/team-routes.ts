import { Request, Response, Router } from 'express';
import { storage } from './storage';
import { emailService } from './email-service';
import { appBaseUrl, invitationExpiryDays } from './config';
import crypto from 'crypto';
import { z } from 'zod';
import { isAuthenticated } from './auth';
import db from './db';

// Create a router for team-related endpoints
const teamRouter = Router();

// Helper function to generate a random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to check if user is a team member or owner
async function isTeamMemberOrOwner(req: Request, res: Response, next: Function) {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user is the owner
    if (team.ownerId === userId) {
      return next();
    }
    
    // Check if user is a team member
    const members = await storage.getTeamMembers(teamId);
    const isMember = members.some(member => member.userId === userId);
    
    if (isMember) {
      return next();
    }
    
    return res.status(403).json({ error: 'You do not have permission to access this resource' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error checking team membership' });
  }
}

// Middleware to check if user is a team owner
async function isTeamOwner(req: Request, res: Response, next: Function) {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if user is the owner
    if (team.ownerId === userId) {
      return next();
    }
    
    return res.status(403).json({ error: 'Only team owners can perform this action' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error checking team ownership' });
  }
}

// Get teams for the authenticated user
teamRouter.get('/teams', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const teams = await storage.getTeams(userId);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
});

// Get a specific team
teamRouter.get('/teams/:teamId', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const team = await storage.getTeam(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Error fetching team' });
  }
});

// Create a new team
teamRouter.post('/teams', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const schema = z.object({
      name: z.string().min(1).max(100),
    });
    
    const validatedData = schema.parse(req.body);
    
    try {
      const team = await storage.createTeam({
        name: validatedData.name,
        ownerId: userId,
      });
      
      // No need to add the creator as a member again since createTeam already does this
      return res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      return res.status(500).json({ error: 'Failed to create team' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating team:', error);
    return res.status(500).json({ error: 'Error creating team' });
  }
});

// Update a team
teamRouter.patch('/teams/:teamId', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
    });
    
    const validatedData = schema.parse(req.body);
    
    const team = await storage.updateTeam(teamId, {
      name: validatedData.name,
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Error updating team' });
  }
});

// Delete a team
teamRouter.delete('/teams/:teamId', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const success = await storage.deleteTeam(teamId);
    
    if (!success) {
      return res.status(404).json({ error: 'Team not found or could not be deleted' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Error deleting team' });
  }
});

// Get team members
teamRouter.get('/teams/:teamId/members', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const members = await storage.getTeamMembers(teamId);
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Error fetching team members' });
  }
});

// Remove a team member
teamRouter.delete('/teams/:teamId/members/:userId', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const memberUserId = parseInt(req.params.userId);
    
    // Check if the user being removed is the owner
    const team = await storage.getTeam(teamId);
    if (team?.ownerId === memberUserId) {
      return res.status(403).json({ error: 'Cannot remove team owner. Transfer ownership first or delete the team.' });
    }
    
    const success = await storage.removeTeamMember(teamId, memberUserId);
    
    if (!success) {
      return res.status(404).json({ error: 'Team member not found or could not be removed' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Error removing team member' });
  }
});

// Add a team member directly (without invitation)
teamRouter.post('/teams/:teamId/members', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['member', 'admin']).default('member'),
    });
    
    const validatedData = schema.parse(req.body);
    
    // Check if user exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    
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
      role: validatedData.role
    });
    
    res.status(201).json(teamMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Error adding team member' });
  }
});

// Update a team member's role
teamRouter.patch('/teams/:teamId/members/:userId', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const memberUserId = parseInt(req.params.userId);
    
    const schema = z.object({
      role: z.enum(['member', 'admin']),
    });
    
    const validatedData = schema.parse(req.body);
    
    // Check if the user being updated is the owner
    const team = await storage.getTeam(teamId);
    if (team?.ownerId === memberUserId) {
      return res.status(403).json({ error: 'Cannot change the role of the team owner' });
    }
    
    const updatedMember = await storage.updateTeamMemberRole(teamId, memberUserId, validatedData.role);
    
    if (!updatedMember) {
      return res.status(404).json({ error: 'Team member not found or could not be updated' });
    }
    
    res.json(updatedMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating team member role:', error);
    res.status(500).json({ error: 'Error updating team member role' });
  }
});

// Send team invitation
teamRouter.post('/teams/:teamId/invitations', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const schema = z.object({
      email: z.string().email(),
    });
    
    const validatedData = schema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    
    // If user exists, check if already a member
    if (existingUser) {
      const members = await storage.getTeamMembers(teamId);
      const isAlreadyMember = members.some(member => member.userId === existingUser.id);
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: 'User is already a member of this team' });
      }
    }
    
    // Get team info
    const team = await storage.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get inviter info
    const inviter = await storage.getUser(userId);
    if (!inviter) {
      return res.status(500).json({ error: 'Inviter information not found' });
    }
    
    // Generate token
    const token = generateToken();
    
    // Set expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + invitationExpiryDays);
    
    // Create invitation
    const invitation = await storage.createTeamInvitation({
      teamId,
      email: validatedData.email,
      invitedBy: userId,
      token, 
      // expiresAt is handled in the schema defaults
    });
    
    // Send invitation email
    let emailSent = false;
    if (emailService.isReady()) { // Use configured email service
      // כתובת לטיפול בהזמנות בקליינט - שימוש בפורמט אחיד בכל המקומות
      const inviteLink = `${appBaseUrl}/invitation/${token}`;
      console.log(`Generated invitation link: ${inviteLink}`);
      
      if (existingUser) {
        // Send regular invitation
        emailSent = await emailService.sendTeamInvitation(
          invitation,
          inviter,
          team,
          inviteLink
        );
      } else {
        // Send invitation with registration link
        // כתובת לרישום משתמש חדש עם פרמטר ההזמנה
      const registerLink = `${appBaseUrl}/auth?inviteToken=${token}`;
        emailSent = await emailService.sendInvitationWithRegistration(
          invitation,
          inviter,
          team,
          registerLink
        );
      }
      
      if (!emailSent) {
        console.warn(`Failed to send invitation email to ${validatedData.email}`);
      }
    } else {
      console.warn('Email service not configured. Invitation created but email not sent.');
    }
    
    // Don't return the token in the response for security
    const { token: _, ...safeInvitation } = invitation;
    
    res.status(201).json({
      ...safeInvitation,
      emailSent: emailService.isReady(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error sending team invitation:', error);
    res.status(500).json({ error: 'Error sending team invitation' });
  }
});

// Get team invitations
teamRouter.get('/teams/:teamId/invitations', isTeamOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const invitations = await storage.getTeamInvitationsByTeam(teamId);
    
    // Filter out tokens for security
    const safeInvitations = invitations.map(({ token, ...rest }) => rest);
    
    res.json(safeInvitations);
  } catch (error) {
    console.error('Error fetching team invitations:', error);
    res.status(500).json({ error: 'Error fetching team invitations' });
  }
});

// Accept or reject an invitation by token (original route)
teamRouter.post('/invitations/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated to accept an invitation' });
    }
    
    const schema = z.object({
      action: z.enum(['accept', 'decline']),
    });
    
    const validatedData = schema.parse(req.body);
    
    // Find invitation
    const invitation = await storage.getTeamInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }
    
    // Check if invitation is already processed
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }
    
    // Check if invitation is expired
    const expiryDate = new Date(invitation.expiresAt);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }
    
    if (validatedData.action === 'accept') {
      // Check if user is already a member
      const members = await storage.getTeamMembers(invitation.teamId);
      const isAlreadyMember = members.some(member => member.userId === userId);
      
      if (isAlreadyMember) {
        await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
        return res.status(400).json({ error: 'You are already a member of this team' });
      }
      
      // Add user to team
      await storage.addTeamMember({
        teamId: invitation.teamId,
        userId: userId,
        role: 'member',
      });
      
      // Update invitation status
      await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
      
      res.json({ success: true, message: 'Invitation accepted. You are now a member of the team.' });
    } else {
      // Update invitation status to declined
      await storage.updateTeamInvitationStatus(invitation.id, 'declined');
      res.json({ success: true, message: 'Invitation declined.' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error processing invitation:', error);
    res.status(500).json({ error: 'Error processing invitation' });
  }
});

// Accept invitation by ID - new route
teamRouter.post('/invitations/:invitationId/accept', isAuthenticated, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated to accept an invitation' });
    }
    
    // Get the invitation
    const invitationStmt = `SELECT * FROM team_invitations WHERE id = ?`;
    const invitation = await db.get(invitationStmt, [invitationId]);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Check if invitation is already processed
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }
    
    // Check if invitation is expired
    const expiryDate = new Date(invitation.expires_at);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }
    
    // Check if user is already a member
    const members = await storage.getTeamMembers(invitation.team_id);
    const isAlreadyMember = members.some(member => member.userId === userId);
    
    if (isAlreadyMember) {
      await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
      return res.json({ success: true, message: 'You are already a member of this team' });
    }
    
    // Add user to team
    await storage.addTeamMember({
      teamId: invitation.team_id,
      userId: userId,
      role: 'member',
    });
    
    // Update invitation status
    await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
    
    res.json({ success: true, message: 'Invitation accepted. You are now a member of the team.' });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Error accepting invitation' });
  }
});

// Decline invitation by ID - new route
teamRouter.post('/invitations/:invitationId/decline', isAuthenticated, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated to decline an invitation' });
    }
    
    // Get the invitation
    const invitationStmt = `SELECT * FROM team_invitations WHERE id = ?`;
    const invitation = await db.get(invitationStmt, [invitationId]);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Check if invitation is already processed
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }
    
    // Update invitation status
    await storage.updateTeamInvitationStatus(invitation.id, 'declined');
    
    res.json({ success: true, message: 'Invitation declined.' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ error: 'Error declining invitation' });
  }
});

// Get invitations for the current user
teamRouter.get('/teams/invitations/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated' });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const invitations = await storage.getTeamInvitationsByEmail(user.email);
    
    // Filter to only pending invitations that haven't expired
    const pendingInvitations = invitations
      .filter(inv => inv.status === 'pending')
      .filter(inv => new Date(inv.expiresAt) > new Date());
      
    // Get team information for each invitation
    const invitationsWithTeams = await Promise.all(
      pendingInvitations.map(async (invitation) => {
        const team = await storage.getTeam(invitation.teamId);
        // Remove sensitive token information
        const { token, ...rest } = invitation;
        return {
          ...rest,
          team
        };
      })
    );
    
    res.json(invitationsWithTeams);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Error fetching invitations' });
  }
});

// Get team statistics
teamRouter.get('/teams/:teamId/stats', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const stats = await storage.getTeamStats(teamId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Error fetching team stats' });
  }
});

// Get team topic distribution
teamRouter.get('/teams/:teamId/topic-distribution', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const distribution = await storage.getTeamTopicDistribution(teamId);
    res.json(distribution);
  } catch (error) {
    console.error('Error fetching team topic distribution:', error);
    res.status(500).json({ error: 'Error fetching team topic distribution' });
  }
});

// Get team member activity
teamRouter.get('/teams/:teamId/member-activity', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const activity = await storage.getTeamMemberActivity(teamId);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching team member activity:', error);
    res.status(500).json({ error: 'Error fetching team member activity' });
  }
});

// Get team topics
teamRouter.get('/teams/:teamId/topics', isTeamMemberOrOwner, async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const topics = await storage.getTeamTopics(teamId);
    res.json(topics);
  } catch (error) {
    console.error('Error fetching team topics:', error);
    res.status(500).json({ error: 'Error fetching team topics' });
  }
});

export { teamRouter };