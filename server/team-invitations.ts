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
      // Convert any snake_case to camelCase if needed
      return {
        id: inv.id,
        teamId: inv.teamId || inv.team_id,
        email: inv.email,
        status: inv.status,
        teamName: inv.teamName || inv.team_name, // This could come from SQL query
        invitedBy: inv.invitedBy || inv.invited_by,
        expiresAt: inv.expiresAt || inv.expires_at,
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
// Support multiple API endpoints for maximum compatibility
invitationsRouter.post([
  '/api/teams/invitations/:tokenOrId/:action', 
  '/api/accept-invitation/:tokenOrId/:action',
  '/api/invitations/:tokenOrId/:action' // הוספת נתיב נוסף קצר יותר
], isAuthenticated, async (req, res) => {
  try {
    const tokenOrId = req.params.tokenOrId;
    const action = req.params.action;
    const userId = req.user?.id;
    console.log('Responding to invitation:', { tokenOrId, action, userId });
    
    // תיעוד מפורט יותר של הבקשה
    console.log('Invitation response request details:', {
      tokenOrId,
      action,
      userId,
      headers: req.headers,
      cookies: req.cookies
    });
    
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
      // בדוק אם זהו מזהה מספרי או טוקן
      if (/^\d+$/.test(tokenOrId)) {
        // מזהה מספרי
        const invitationId = parseInt(tokenOrId);
        invitation = await storage.getTeamInvitationById(invitationId);
        console.log('Looking up invitation by ID:', invitationId, invitation);
      } else {
        // טוקן
        console.log('Looking up invitation directly by token:', tokenOrId);
        invitation = await storage.getTeamInvitationByToken(tokenOrId);
        
        // אם לא מצאנו, ננסה לחפש בדרכים חלופיות
        if (!invitation) {
          console.log('Invitation not found by direct token lookup, trying alternative method');
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
    
    // Use camelCase property (normalize data access)
    const expiryTimestamp = invitation.expiresAt;
    
    // Check if invitation is expired
    const expiryDate = new Date(expiryTimestamp);
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // בדיקת קיום המשתמש
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    // לוג לבדיקה - שימושי לדיבאג
    console.log(`User ${user.id} (${user.email}) is handling invitation for: ${invitation.email}`);
    
    if (action === 'accept') {
      // Check if user is already a member
      const teamId = invitation.teamId || invitation.team_id;
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
      
      // Get team information for better response
      const team = await storage.getTeam(teamId);
      console.log('Team info for response:', team);
      
      // Safety check for team name to avoid undefined
      const teamName = team && team.name ? team.name : 'חדש';
      
      res.json({ 
        success: true, 
        message: `הזמנה התקבלה בהצלחה. הצטרפת לצוות "${teamName}".`,
        team: team ? {
          id: team.id,
          name: teamName
        } : null
      });
    } else {
      // Update invitation status to declined
      await storage.updateTeamInvitationStatus(invitation.id, 'declined');
      res.json({ success: true, message: 'ההזמנה נדחתה בהצלחה.' });
    }
  } catch (error) {
    console.error('Error processing invitation:', error);
    res.status(500).json({ error: 'Error processing invitation' });
  }
});

// נתיב ייעודי לדחיית הזמנה מהדף הסטטי
invitationsRouter.post('/api/teams/invitations/:token/reject', isAuthenticated, async (req, res) => {
  try {
    const token = req.params.token;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    console.log('Direct invitation reject API called with token:', token);
    
    // נמצא את ההזמנה לפי הטוקן
    let invitation;
    try {
      invitation = await storage.getTeamInvitationByToken(token);
      console.log('Found invitation for rejection:', invitation);
    } catch (error) {
      console.error('Error finding invitation for rejection:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error finding invitation' 
      });
    }
    
    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invitation not found' 
      });
    }
    
    // בדוק שההזמנה לא פג תוקף ולא כבר אושרה/נדחתה
    const expiryTimestamp = invitation.expires_at || invitation.expiresAt;
    const expiresAt = new Date(expiryTimestamp);
    const now = new Date();
    
    if (now > expiresAt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation has expired' 
      });
    }
    
    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Invitation has already been ${invitation.status}` 
      });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ 
        success: false, 
        error: 'This invitation is for a different email address' 
      });
    }
    
    // דחיית ההזמנה
    try {
      // Update invitation status to declined
      await storage.updateTeamInvitationStatus(invitation.id, 'declined');
      
      res.status(200).json({ 
        success: true, 
        message: `ההזמנה נדחתה בהצלחה.`
      });
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error rejecting invitation' 
      });
    }
  } catch (error) {
    console.error('Error in invitation reject API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

// נתיב ייעודי לאישור הזמנה מהדף הסטטי
invitationsRouter.post('/api/teams/invitations/:token/accept', isAuthenticated, async (req, res) => {
  try {
    const token = req.params.token;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    console.log('Direct invitation accept API called with token:', token);
    
    // נמצא את ההזמנה לפי הטוקן
    let invitation;
    try {
      invitation = await storage.getTeamInvitationByToken(token);
      console.log('Found invitation:', invitation);
    } catch (error) {
      console.error('Error finding invitation:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Error finding invitation' 
      });
    }
    
    if (!invitation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invitation not found' 
      });
    }
    
    // בדוק שההזמנה לא פג תוקף ולא כבר אושרה/נדחתה
    const expiryTimestamp = invitation.expires_at || invitation.expiresAt;
    const expiresAt = new Date(expiryTimestamp);
    const now = new Date();
    
    if (now > expiresAt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation has expired' 
      });
    }
    
    if (invitation.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: `Invitation has already been ${invitation.status}` 
      });
    }
    
    // Check if user's email matches the invitation email
    const user = await storage.getUser(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ 
        success: false, 
        error: 'This invitation is for a different email address' 
      });
    }
    
    // Check if user is already a member
    const teamId = invitation.teamId || invitation.team_id;
    if (!teamId) {
      console.error('Team ID missing in invitation:', invitation);
      return res.status(500).json({ 
        success: false, 
        error: 'Invalid invitation data: missing team ID' 
      });
    }
    
    const members = await storage.getTeamMembers(teamId);
    const isAlreadyMember = members.some(member => member.userId === userId);
    
    if (isAlreadyMember) {
      await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
      return res.status(400).json({ 
        success: false, 
        error: 'You are already a member of this team' 
      });
    }
    
    // אישור ההזמנה
    try {
      // Add user to team
      await storage.addTeamMember({
        teamId: teamId,
        userId: userId,
        role: 'member'
      });
      
      // Update invitation status
      await storage.updateTeamInvitationStatus(invitation.id, 'accepted');
      
      // Get team information for better response
      const team = await storage.getTeam(teamId);
      console.log('Team info for response:', team);
      
      // Safety check for team name to avoid undefined
      const teamName = team && team.name ? team.name : 'החדש';
      
      res.status(200).json({ 
        success: true, 
        message: `ההזמנה התקבלה בהצלחה. הצטרפת לצוות "${teamName}".`,
        teamId
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error accepting invitation' 
      });
    }
  } catch (error) {
    console.error('Error in invitation accept API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
});

export { invitationsRouter };