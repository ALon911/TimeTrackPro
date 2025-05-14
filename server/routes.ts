import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTopicSchema, 
  insertTimeEntrySchema 
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { teamsRouter } from "./teams-simple";
import { z } from "zod";
import path from "path";
import { directMemberRouter } from "./direct-member-route";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  
  // Topic routes
  app.get("/api/topics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const topics = await storage.getTopics(userId);
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  app.post("/api/topics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      // Ensure the userId in the request is the logged-in user's ID
      const topicData = insertTopicSchema.parse({
        ...req.body,
        userId
      });
      
      const topic = await storage.createTopic(topicData);
      res.status(201).json(topic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid topic data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create topic" });
    }
  });

  app.put("/api/topics/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      // Get the current topic to verify ownership
      const topic = await storage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this topic" });
      }
      
      const topicUpdate = insertTopicSchema.partial().parse(req.body);
      const updatedTopic = await storage.updateTopic(id, topicUpdate);
      
      res.json(updatedTopic);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid topic data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update topic" });
    }
  });

  app.delete("/api/topics/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }
      
      // Get the current topic to verify ownership
      const topic = await storage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this topic" });
      }
      
      await storage.deleteTopic(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const filters: {
        topicId?: number;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
      } = {};
      
      if (req.query.topicId) {
        filters.topicId = parseInt(req.query.topicId as string);
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      
      const timeEntries = await storage.getTimeEntries(userId, filters);
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Ensure the userId in the request is the logged-in user's ID
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId
      });
      
      // Verify that the specified topic belongs to the user
      if (timeEntryData.topicId) {
        const topic = await storage.getTopic(timeEntryData.topicId);
        if (!topic || topic.userId !== userId) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid time entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid time entry ID" });
      }
      
      // Get the current time entry to verify ownership
      const entry = await storage.getTimeEntry(id);
      
      // Check if entry exists and belongs to the user
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (entry.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to update this time entry" });
      }
      
      const timeEntryUpdate = insertTimeEntrySchema.partial().parse(req.body);
      
      // Don't allow changing the user ID
      delete timeEntryUpdate.userId;
      
      // If topic ID is being updated, verify it belongs to the user
      if (timeEntryUpdate.topicId) {
        const topic = await storage.getTopic(timeEntryUpdate.topicId);
        if (!topic || topic.userId !== req.user!.id) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const updatedTimeEntry = await storage.updateTimeEntry(id, timeEntryUpdate);
      
      res.json(updatedTimeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid time entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid time entry ID" });
      }
      
      // Get the current time entry to verify ownership
      const entry = await storage.getTimeEntry(id);
      
      // Check if entry exists and belongs to the user
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (entry.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this time entry" });
      }
      
      await storage.deleteTimeEntry(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Statistics routes
  app.get("/api/stats/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getDailyStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/stats/weekly", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getWeeklyStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  app.get("/api/stats/most-tracked", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getMostTrackedTopic(userId);
      
      if (!stats) {
        return res.status(404).json({ message: "No data available" });
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch most tracked topic" });
    }
  });

  app.get("/api/stats/topic-distribution", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getTopicDistribution(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch topic distribution" });
    }
  });

  app.get("/api/stats/weekly-overview", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await storage.getWeeklyOverview(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch weekly overview" });
    }
  });

  app.get("/api/stats/recent-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const sessions = await storage.getRecentSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent sessions" });
    }
  });

  // User profile update endpoint
  app.put("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate the input using zod
      const updateSchema = z.object({
        username: z.string().min(2).optional(),
        email: z.string().email().optional(),
      });
      
      const userData = updateSchema.parse(req.body);
      
      // If updating email, check if it's already in use by another user
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      
      // Update the user profile
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the updated user data without the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Manually add endpoint for user's pending invitations
  app.get('/api/teams/invitations/my', isAuthenticated, async (req, res) => {
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
      res.status(500).json([]);
    }
  });
  
  // Register teams routes
  app.use('', teamsRouter);
  
  // Register direct member routes
  app.use('', directMemberRouter);
  
  // Serve HTML add member page directly
  app.get('/add-member-popup/:teamId', (req, res) => {
    const filePath = path.join(__dirname, 'add-member-page.html');
    res.sendFile(filePath);
  });
  
  // Add delete account endpoint
  app.delete("/api/user/account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Delete the user account
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete account" });
      }
      
      // Log the user out after successful deletion
      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
        }
        res.status(204).end();
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
