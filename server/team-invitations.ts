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
    
    console.log('Fetching invitations for email:', user.email);
    
    const invitations = await storage.getTeamInvitationsByEmail(user.email);
    console.log('Found invitations:', invitations);
    
    // Filter out pending invitations only
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
    console.log('Pending invitations:', pendingInvitations);
    
    // Modify the format to include team information
    const enhancedInvitations = pendingInvitations.map(inv => {
      // Convert snake_case to camelCase
      return {
        id: inv.id,
        teamId: inv.team_id,
        email: inv.email,
        status: inv.status,
        teamName: inv.team_name, // This comes from our SQL query
        invitedBy: inv.invited_by,
        expiresAt: inv.expires_at,
        token: inv.token,
      };
    });
    console.log('Enhanced invitations:', enhancedInvitations);
    
    // שים לב: אני לא מסיר את ה-token עכשיו כי צריך אותו בצד הלקוח לתגובה על ההזמנה
    // const safeInvitations = enhancedInvitations.map(({ token, ...rest }) => rest);
    const safeInvitations = enhancedInvitations;
    console.log('Safe invitations to return:', safeInvitations);
    
    res.json(safeInvitations);
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    res.status(500).json({ error: 'Error fetching user invitations' });
  }
});

// Respond to an invitation (accept or decline) using invitation token or ID
invitationsRouter.post('/api/teams/invitations/:tokenOrId/:action', isAuthenticated, async (req, res) => {
  try {
    const tokenOrId = req.params.tokenOrId;
    const action = req.params.action;
    const userId = req.user?.id;
    console.log('Responding to invitation:', { tokenOrId, action, userId });
    
    if (!userId) {
      return res.status(401).json({ error: 'Must be authenticated to respond to an invitation' });
    }
    
    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: 'Invalid action. Must be "accept" or "decline"' });
    }
    
    // Get the invitation by token first, if not found try by ID
    let invitation;
    
    // Log full request details for debugging
    console.log('Invitation response request details:', { 
      tokenOrId, 
      action, 
      userId, 
      headers: req.headers,
      cookies: req.cookies
    });
    
    try {
      // Get all tokens from the database to debug
      const allTokensStmt = "SELECT id, token FROM team_invitations";
      const allTokens = storage.db ? storage.db.prepare(allTokensStmt).all() : [];
      console.log('All tokens in database:', allTokens);
      
      // Check if tokenOrId is a number or a string token
      if (/^\d+$/.test(tokenOrId)) {
        // It's a number, treat as ID
        const invitationId = parseInt(tokenOrId);
        invitation = await storage.getTeamInvitationById(invitationId);
        console.log('Looking up invitation by ID:', invitationId, invitation);
      } else {
        // Hack: Try looking up by ID first, for testing
        console.log('Trying to find by numeric ID in tokens table');
        if (allTokens && allTokens.length > 0) {
          const foundInvitation = allTokens.find(t => t.token === tokenOrId);
          if (foundInvitation) {
            console.log('Found invitation by token in local search:', foundInvitation);
            invitation = await storage.getTeamInvitationById(foundInvitation.id);
          }
        }
        
        // If not found, try by token
        if (!invitation) {
          console.log('Searching for invitation with token:', tokenOrId);
          invitation = await storage.getTeamInvitationByToken(tokenOrId);
          console.log('Looking up invitation by token result:', invitation);
        }
      }
    } catch (err) {
      console.error('Error looking up invitation:', err);
    }
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }
    
    // Log the invitation to see its structure
    console.log('Invitation object:', invitation);
    
    // Check if invitation is already processed
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }
    
    // Handle both property formats (snake_case from database and camelCase from API)
    const expiryTimestamp = invitation.expires_at || invitation.expiresAt;
    
    // Check if invitation is expired
    const expiryDate = new Date(expiryTimestamp);
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