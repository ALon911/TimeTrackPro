import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { dbStorage } from "./database-storage";
import { 
  insertTopicSchema, 
  insertTimeEntrySchema 
} from "@shared/schema";
import { setupAuth, isAuthenticated } from "./auth";
import { setupDownloadRoutes } from "./download-routes";
import { z } from "zod";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Set up download routes
  setupDownloadRoutes(app);
  
  // Serve the Expo app zip file statically
  app.get('/expo-timetracker.zip', (req, res) => {
    const zipPath = path.resolve(process.cwd(), 'expo-timetracker.zip');
    res.download(zipPath);
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Authentication routes are handled by setupAuth

  // Topic routes
  app.get("/api/topics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const topics = await dbStorage.getTopics(userId);
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
      
      const topic = await dbStorage.createTopic(topicData);
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
      const topic = await dbStorage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this topic" });
      }
      
      const topicUpdate = insertTopicSchema.partial().parse(req.body);
      const updatedTopic = await dbStorage.updateTopic(id, topicUpdate);
      
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
      const topic = await dbStorage.getTopic(id);
      
      // Check if topic exists and belongs to the user
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }
      
      if (topic.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this topic" });
      }
      
      const success = await dbStorage.deleteTopic(id);
      
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
      
      const timeEntries = await dbStorage.getTimeEntries(userId, filters);
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post("/api/time-entries", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Log request for debugging
      console.log(`Creating time entry for user ${userId}:`, req.body);
      
      // Ensure the userId in the request is the logged-in user's ID
      const timeEntryData = insertTimeEntrySchema.parse({
        ...req.body,
        userId
      });
      
      // Verify that the specified topic belongs to the user
      if (timeEntryData.topicId) {
        const topic = await dbStorage.getTopic(timeEntryData.topicId);
        if (!topic || topic.userId !== userId) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const timeEntry = await dbStorage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid time entry data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: `Failed to create time entry: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });

  app.put("/api/time-entries/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid time entry ID" });
      }
      
      // Get the current time entry to verify ownership
      const entry = await dbStorage.getTimeEntry(id);
      
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
        const topic = await dbStorage.getTopic(timeEntryUpdate.topicId);
        if (!topic || topic.userId !== req.user!.id) {
          return res.status(400).json({ message: "Invalid topic ID or topic doesn't belong to user" });
        }
      }
      
      const updatedTimeEntry = await dbStorage.updateTimeEntry(id, timeEntryUpdate);
      
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
      const entry = await dbStorage.getTimeEntry(id);
      
      // Check if entry exists and belongs to the user
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (entry.userId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to delete this time entry" });
      }
      
      const success = await dbStorage.deleteTimeEntry(id);
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Statistics routes
  app.get("/api/stats/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await dbStorage.getDailyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
      res.status(500).json({ message: "Failed to fetch daily stats" });
    }
  });

  app.get("/api/stats/weekly", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await dbStorage.getWeeklyStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly stats" });
    }
  });

  app.get("/api/stats/most-tracked", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await dbStorage.getMostTrackedTopic(userId);
      
      if (!stats) {
        return res.status(404).json({ message: "No data available" });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching most tracked topic:", error);
      res.status(500).json({ message: "Failed to fetch most tracked topic" });
    }
  });

  app.get("/api/stats/topic-distribution", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await dbStorage.getTopicDistribution(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching topic distribution:", error);
      res.status(500).json({ message: "Failed to fetch topic distribution" });
    }
  });

  app.get("/api/stats/weekly-overview", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const stats = await dbStorage.getWeeklyOverview(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching weekly overview:", error);
      res.status(500).json({ message: "Failed to fetch weekly overview" });
    }
  });

  app.get("/api/stats/recent-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
      const sessions = await dbStorage.getRecentSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching recent sessions:", error);
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
        const existingUser = await dbStorage.getUserByEmail(userData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }
      
      // Update the user profile
      const updatedUser = await dbStorage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the updated user data
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
