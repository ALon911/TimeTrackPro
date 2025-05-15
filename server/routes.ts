import type { Express, Request, Response, NextFunction } from "express";
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
import { invitationsRouter } from "./team-invitations";
import * as XLSX from 'xlsx';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // API health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  
  // פונקציה משותפת למשלוח קובץ HTML ראשי
  const serveIndexHTML = (req: Request, res: Response, next: NextFunction, routePath: string) => {
    console.log(`${routePath} route hit with token:`, req.params.token);
    const indexPath = path.resolve('client/index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html file:', err);
        next(err);
      } else {
        console.log(`Successfully served index.html for ${routePath}`);
      }
    });
  };

  // Handle invitation routes for SPA with debug information
  app.get('/invitations/:token', (req, res, next) => {
    serveIndexHTML(req, res, next, '/invitations/:token');
  });
  
  // נתיב אחיד מועדף להזמנות - בלשון יחיד (invitation במקום invitations)
  app.get('/invitation/:token', (req, res, next) => {
    serveIndexHTML(req, res, next, '/invitation/:token');
  });
  
  // נתיב חלופי נוסף עבור הזמנות דרך המסך הראשי של הSPA
  app.get('/accept-invitation/:token', (req, res, next) => {
    serveIndexHTML(req, res, next, '/accept-invitation/:token');
  });
  
  // נתיב ישיר לקבלת הזמנה (עמוד פשוט עם לוגיקה מובנית, דף HTML נפרד מהSPA)
  // אפשר להשתמש בנתיב הזה ישירות מהמייל כדי לאשר ללא צורך בכניסה למערכת
  app.get(['/direct-accept/:token', '/invitations/:token/accept', '/invitation/:token/accept', '/invitations/accept/:token'], (req, res) => {
    const token = req.params.token;
    console.log('Accept-invitation route hit with token:', token);
    
    // עמוד HTML פשוט עם כפתור שעושה פנייה ישירה לAPI
    const htmlPage = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>הזמנה לצוות</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          background-color: #f5f7fb;
          color: #333;
          max-width: 800px;
          margin: 40px auto;
          text-align: center;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #4361ee;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background-color: #4361ee;
          color: white;
          padding: 12px 24px;
          border-radius: 4px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 20px;
          transition: background-color 0.3s;
          cursor: pointer;
          border: none;
        }
        .button:hover {
          background-color: #3a56d4;
        }
        .note {
          margin-top: 20px;
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          font-size: 0.9em;
          color: #666;
        }
        .response {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
          display: none;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>הזמנה לצוות</h1>
        <p>התקבלה הזמנה להצטרף לצוות במערכת מעקב הזמן.</p>
        
        <div id="not-logged-in">
          <p>כדי לקבל את ההזמנה, יש להיכנס למערכת תחילה:</p>
          <a href="/auth" class="button">התחבר למערכת</a>
          <div class="note">
            <p>לאחר ההתחברות, חזור לדף זה כדי לאשר את ההזמנה.</p>
          </div>
        </div>
        
        <div id="logged-in" style="display: none;">
          <p>אתה מחובר למערכת. כעת תוכל לקבל את ההזמנה:</p>
          <button onclick="acceptInvitation()" class="button">אשר הזמנה</button>
          
          <div id="response-success" class="response success">
            <h3>ההזמנה התקבלה בהצלחה!</h3>
            <p id="success-message"></p>
            <a href="/teams" class="button" style="margin-top: 10px;">עבור לעמוד הצוותים</a>
          </div>
          
          <div id="response-error" class="response error">
            <h3>אירעה שגיאה</h3>
            <p id="error-message"></p>
            <button onclick="acceptInvitation()" class="button">נסה שוב</button>
          </div>
        </div>
      </div>
      
      <script>
        // בדוק אם המשתמש מחובר
        checkAuth();
        
        function checkAuth() {
          fetch('/api/user')
            .then(response => {
              if (response.ok) {
                // משתמש מחובר
                document.getElementById('not-logged-in').style.display = 'none';
                document.getElementById('logged-in').style.display = 'block';
                
                // אישור אוטומטי כאשר המשתמש מחובר (one-click)
                acceptInvitation();
                
                return response.json();
              } else {
                // משתמש לא מחובר
                document.getElementById('not-logged-in').style.display = 'block';
                document.getElementById('logged-in').style.display = 'none';
                throw new Error('Not authenticated');
              }
            })
            .catch(error => {
              console.error('Auth check error:', error);
            });
        }
        
        function acceptInvitation() {
          const token = "${token}";
          
          fetch(\`/api/teams/invitations/\${token}/accept\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              document.getElementById('success-message').textContent = data.message || 'ההזמנה התקבלה בהצלחה';
              document.getElementById('response-success').style.display = 'block';
              document.getElementById('response-error').style.display = 'none';
            } else {
              throw new Error(data.error || 'אירעה שגיאה בעת קבלת ההזמנה');
            }
          })
          .catch(error => {
            document.getElementById('error-message').textContent = error.message;
            document.getElementById('response-success').style.display = 'none';
            document.getElementById('response-error').style.display = 'block';
          });
        }
      </script>
    </body>
    </html>
    `;
    
    res.send(htmlPage);
  });
  
  // Topic routes
  app.get("/api/topics", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching topics for user:", req.user!.id);
      const userId = req.user!.id;
      
      // Get topics and make sure they're unique
      const topics = await storage.getTopics(userId);
      
      // Create a Set to track seen IDs
      const seenIds = new Set();
      const uniqueTopics = [];
      
      // Filter out duplicates
      for (const topic of topics) {
        if (!seenIds.has(topic.id)) {
          seenIds.add(topic.id);
          uniqueTopics.push(topic);
        } else {
          console.log("Filtered out duplicate topic:", topic.id, topic.name);
        }
      }
      
      console.log(`Found ${topics.length} topics, ${uniqueTopics.length} unique topics`);
      res.json(uniqueTopics);
    } catch (error) {
      console.error("Error fetching topics:", error);
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

  // We've moved the invitations endpoints to team-invitations.ts
  
  // Register teams routes
  app.use('', teamsRouter);
  
  // Register direct member routes
  app.use('', directMemberRouter);
  
  // Register team invitations routes
  app.use('', invitationsRouter);
  
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
  
  // Export personal time entries and statistics to Excel
  app.get("/api/export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user data
      const topics = await storage.getTopics(userId);
      const timeEntries = await storage.getTimeEntries(userId);
      const dailyStats = await storage.getDailyStats(userId);
      const weeklyStats = await storage.getWeeklyStats(userId);
      const topicDistribution = await storage.getTopicDistribution(userId);
      const mostTracked = await storage.getMostTrackedTopic(userId);
      const weeklyOverview = await storage.getWeeklyOverview(userId);
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Personal Overview Sheet
      const overviewData = [
        ['שם משתמש', req.user!.username],
        ['אימייל', req.user!.email],
        ['זמן כולל היום', formatTime(dailyStats.total)],
        ['זמן כולל השבוע', formatTime(weeklyStats.total)],
        ['הנושא הנמדד ביותר', mostTracked ? mostTracked.topic.name : 'אין'],
        ['זמן בנושא הנמדד ביותר', mostTracked ? formatTime(mostTracked.totalTime) : '0:00:00']
      ];
      const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWs, 'סקירה כללית');
      
      // Topics Sheet
      const topicsHeader = ['מזהה', 'שם נושא', 'צבע'];
      const topicsData = topics.map(topic => [
        topic.id.toString(),
        topic.name,
        topic.color
      ]);
      
      const topicsWs = XLSX.utils.aoa_to_sheet([topicsHeader, ...topicsData]);
      XLSX.utils.book_append_sheet(wb, topicsWs, 'נושאים');
      
      // Time Entries Sheet
      const timeEntriesHeader = ['מזהה', 'נושא', 'תיאור', 'זמן התחלה', 'זמן סיום', 'משך (שניות)'];
      const timeEntriesData = timeEntries.map(entry => {
        const topicName = topics.find(t => t.id === entry.topicId)?.name || 'לא ידוע';
        return [
          entry.id.toString(),
          topicName,
          entry.description || 'אין תיאור',
          new Date(entry.startTime).toLocaleString('he-IL'),
          new Date(entry.endTime).toLocaleString('he-IL'),
          entry.duration.toString()
        ];
      });
      
      const timeEntriesWs = XLSX.utils.aoa_to_sheet([timeEntriesHeader, ...timeEntriesData]);
      XLSX.utils.book_append_sheet(wb, timeEntriesWs, 'רשומות זמן');
      
      // Topic Distribution Sheet
      const distributionHeader = ['נושא', 'זמן כולל', 'אחוז מסך הכל'];
      const distributionData = topicDistribution.map(item => [
        item.topic.name,
        formatTime(item.totalTime),
        `${item.percentage.toFixed(1)}%`
      ]);
      
      const distributionWs = XLSX.utils.aoa_to_sheet([distributionHeader, ...distributionData]);
      XLSX.utils.book_append_sheet(wb, distributionWs, 'התפלגות נושאים');
      
      // Weekly Overview Sheet
      const weeklyHeader = ['יום', 'יום בשבוע', 'זמן כולל'];
      const weeklyData = weeklyOverview.map(day => [
        day.day,
        day.dayOfWeek,
        formatTime(day.totalTime)
      ]);
      
      const weeklyWs = XLSX.utils.aoa_to_sheet([weeklyHeader, ...weeklyData]);
      XLSX.utils.book_append_sheet(wb, weeklyWs, 'סקירה שבועית');
      
      // Write to buffer and send
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Disposition', `attachment; filename="${req.user!.username}-time-report.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buf);
      
    } catch (error) {
      console.error('Error exporting personal data to Excel:', error);
      res.status(500).json({ error: 'Failed to export personal data' });
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
  
  // Skip the catch-all route in development
  // In development mode we're not using our own spa fallback
  // but letting Vite handle all non-api routes
  if (process.env.NODE_ENV !== 'development') {
    // Fallback route for SPA - all routes that are not API routes will serve the index.html
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Skip assets and files with extensions
      if (req.path.includes('.')) {
        return next();
      }
      
      console.log('Fallback route hit for path:', req.path);
      const indexPath = path.resolve('client/index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html file:', err);
          next(err);
        } else {
          console.log('Successfully served index.html for:', req.path);
        }
      });
    });
  } else {
    console.log('Running in development mode - not setting up fallback route');
  }

  const httpServer = createServer(app);
  return httpServer;
}
