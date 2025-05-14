import { Request, Response, Router } from 'express';
import { storage } from './storage';
import { isAuthenticated } from './auth';
import { z } from 'zod';

const invitationsRouter = Router();

// Get invitations for the current user
invitationsRouter.get('/api/teams/invitations/my', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
  
    if (!userId) {
      return res.status(401).json([]);
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json([]);
    }
    
    const invitations = await storage.getTeamInvitationsByEmail(user.email);
    
    // Filter out pending invitations only
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    
    // Don't expose tokens in the response
    const safeInvitations = pendingInvitations.map(({ token, ...rest }) => rest);
    
    res.json(safeInvitations);
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    res.status(500).json({ error: 'Error fetching user invitations' });
  }
});

// Respond to an invitation (accept or decline) using invitation ID
invitationsRouter.post('/api/teams/invitations/:invitationId/:action', isAuthenticated, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const action = req.params.action;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated to respond to an invitation' });
    }
    
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'Invalid action. Must be "accept" or "decline"' });
    }
    
    // Get the invitation
    const invitation = await storage.getTeamInvitationById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Log the invitation to see its structure
    console.log('Invitation object:', invitation);
    
    // Check if invitation is already processed
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }
    
    // Check if invitation is expired
    const expiryDate = new Date(invitation.expires_at || invitation.expiresAt);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }
    
    if (action === 'accept') {
      // Check if user is already a member
      const teamId = invitation.team_id || invitation.teamId;
      if (!teamId) {
        console.error('Team ID missing in invitation:', invitation);
        return res.status(500).json({ error: 'Invalid invitation data: missing team ID' });
      }
      
      const members = await storage.getTeamMembers(teamId);
      const isAlreadyMember = members.some(member => member.userId === userId);
      
      if (isAlreadyMember) {
        await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
        return res.status(400).json({ error: 'You are already a member of this team' });
      }
      
      // Add user to team
      await storage.addTeamMember({
        teamId: teamId,
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
    console.error('Error processing invitation:', error);
    res.status(500).json({ error: 'Error processing invitation' });
  }
});

export { invitationsRouter };