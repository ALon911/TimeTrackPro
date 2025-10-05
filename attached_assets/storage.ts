import { 
  users, 
  topics, 
  timeEntries, 
  type User, 
  type InsertUser, 
  type Topic, 
  type InsertTopic, 
  type TimeEntry, 
  type InsertTimeEntry,
  type TimeStat,
  type TopicDistribution,
  type WeeklyData,
  type TimeEntrySummary
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<{ username: string; email: string }>): Promise<User | undefined>;
  
  // Topic methods
  getTopics(userId: number): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, topic: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  
  // Time entry methods
  getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  
  // Statistics methods
  getDailyStats(userId: number): Promise<TimeStat>;
  getWeeklyStats(userId: number): Promise<TimeStat>;
  getMostTrackedTopic(userId: number): Promise<{ topic: Topic; totalTime: number } | undefined>;
  getTopicDistribution(userId: number): Promise<TopicDistribution[]>;
  getWeeklyOverview(userId: number): Promise<WeeklyData[]>;
  getRecentSessions(userId: number, limit?: number): Promise<TimeEntrySummary[]>;
}

export type TimeEntryFilters = {
  topicId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
};

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private topics: Map<number, Topic>;
  private timeEntries: Map<number, TimeEntry>;
  private userIdCounter: number;
  private topicIdCounter: number;
  private timeEntryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.topics = new Map();
    this.timeEntries = new Map();
    this.userIdCounter = 1;
    this.topicIdCounter = 1;
    this.timeEntryIdCounter = 1;
    
    // Create a default user for development
    this.createUser({ username: 'user', password: 'password' });
    
    // Create default topics for the default user
    this.createTopic({ userId: 1, name: 'DevOps', color: '#6366f1' });
    this.createTopic({ userId: 1, name: 'Workouts', color: '#8b5cf6' });
    this.createTopic({ userId: 1, name: 'Reading', color: '#ec4899' });
    
    // Add some sample time entries for the default user
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Today's entries
    this.createTimeEntry({
      userId: 1,
      topicId: 1,
      description: 'Kubernetes Training',
      startTime: new Date(now.setHours(10, 30, 0, 0)),
      endTime: new Date(now.setHours(12, 15, 0, 0)),
      duration: 1.75 * 60 * 60, // 1h 45m in seconds
      isManual: true
    });
    
    this.createTimeEntry({
      userId: 1,
      topicId: 2,
      description: 'HIIT Session',
      startTime: new Date(now.setHours(7, 0, 0, 0)),
      endTime: new Date(now.setHours(7, 45, 0, 0)),
      duration: 45 * 60, // 45m in seconds
      isManual: true
    });
    
    // Yesterday's entries
    this.createTimeEntry({
      userId: 1,
      topicId: 1,
      description: 'Docker Composition',
      startTime: new Date(yesterday.setHours(14, 15, 0, 0)),
      endTime: new Date(yesterday.setHours(16, 30, 0, 0)),
      duration: 2.25 * 60 * 60, // 2h 15m in seconds
      isManual: true
    });
    
    this.createTimeEntry({
      userId: 1,
      topicId: 3,
      description: 'System Design Interview',
      startTime: new Date(yesterday.setHours(20, 30, 0, 0)),
      endTime: new Date(yesterday.setHours(21, 15, 0, 0)),
      duration: 45 * 60, // 45m in seconds
      isManual: true
    });
    
    // Add more entries throughout the week for weekly chart
    const weekago = new Date();
    weekago.setDate(weekago.getDate() - 7);
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekago);
      day.setDate(day.getDate() + i);
      const hours = Math.random() * 3 + 0.5; // Random duration between 0.5 and 3.5 hours
      const duration = hours * 60 * 60; // Convert to seconds
      const topicId = Math.floor(Math.random() * 3) + 1; // Random topic 1-3
      
      this.createTimeEntry({
        userId: 1,
        topicId,
        description: `Auto-generated entry for ${day.toDateString()}`,
        startTime: new Date(day.setHours(10, 0, 0, 0)),
        endTime: new Date(day.setHours(10 + Math.floor(hours), Math.floor((hours % 1) * 60), 0, 0)),
        duration,
        isManual: true
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Topic methods
  async getTopics(userId: number): Promise<Topic[]> {
    return Array.from(this.topics.values()).filter(
      (topic) => topic.userId === userId
    );
  }

  async getTopic(id: number): Promise<Topic | undefined> {
    return this.topics.get(id);
  }

  async createTopic(insertTopic: InsertTopic): Promise<Topic> {
    const id = this.topicIdCounter++;
    const topic: Topic = { ...insertTopic, id };
    this.topics.set(id, topic);
    return topic;
  }

  async updateTopic(id: number, topicUpdate: Partial<InsertTopic>): Promise<Topic | undefined> {
    const topic = this.topics.get(id);
    if (!topic) return undefined;
    
    const updatedTopic: Topic = {
      ...topic,
      ...topicUpdate,
    };
    
    this.topics.set(id, updatedTopic);
    return updatedTopic;
  }

  async deleteTopic(id: number): Promise<boolean> {
    return this.topics.delete(id);
  }

  // Time entry methods
  async getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]> {
    let entries = Array.from(this.timeEntries.values()).filter(
      (entry) => entry.userId === userId
    );
    
    if (filters) {
      if (filters.topicId !== undefined) {
        entries = entries.filter(entry => entry.topicId === filters.topicId);
      }
      
      if (filters.startDate !== undefined) {
        entries = entries.filter(entry => entry.startTime >= filters.startDate!);
      }
      
      if (filters.endDate !== undefined) {
        entries = entries.filter(entry => entry.endTime <= filters.endDate!);
      }
      
      // Sort by startTime in descending order (newest first)
      entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      if (filters.limit !== undefined) {
        entries = entries.slice(0, filters.limit);
      }
    }
    
    return entries;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = this.timeEntryIdCounter++;
    const timeEntry: TimeEntry = { ...insertTimeEntry, id };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: number, timeEntryUpdate: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return undefined;
    
    const updatedTimeEntry: TimeEntry = {
      ...timeEntry,
      ...timeEntryUpdate,
    };
    
    this.timeEntries.set(id, updatedTimeEntry);
    return updatedTimeEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  // Statistics methods
  async getDailyStats(userId: number): Promise<TimeStat> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayEntries = await this.getTimeEntries(userId, { 
      startDate: today, 
      endDate: tomorrow 
    });
    
    const yesterdayEntries = await this.getTimeEntries(userId, { 
      startDate: yesterday, 
      endDate: today 
    });
    
    const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const yesterdayTotal = yesterdayEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    let percentChange = 0;
    let increase = true;
    
    if (yesterdayTotal > 0) {
      percentChange = Math.round((todayTotal - yesterdayTotal) / yesterdayTotal * 100);
      increase = percentChange >= 0;
    }
    
    return {
      total: todayTotal,
      compareTotal: yesterdayTotal,
      percentChange: Math.abs(percentChange),
      increase
    };
  }

  async getWeeklyStats(userId: number): Promise<TimeStat> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as first day
    
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
    
    const endOfPrevWeek = new Date(startOfWeek);
    
    const thisWeekEntries = await this.getTimeEntries(userId, { 
      startDate: startOfWeek
    });
    
    const prevWeekEntries = await this.getTimeEntries(userId, { 
      startDate: startOfPrevWeek, 
      endDate: endOfPrevWeek 
    });
    
    const thisWeekTotal = thisWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const prevWeekTotal = prevWeekEntries.reduce((sum, entry) => sum + entry.duration, 0);
    
    let percentChange = 0;
    let increase = true;
    
    if (prevWeekTotal > 0) {
      percentChange = Math.round((thisWeekTotal - prevWeekTotal) / prevWeekTotal * 100);
      increase = percentChange >= 0;
    }
    
    return {
      total: thisWeekTotal,
      compareTotal: prevWeekTotal,
      percentChange: Math.abs(percentChange),
      increase
    };
  }

  async getMostTrackedTopic(userId: number): Promise<{ topic: Topic; totalTime: number } | undefined> {
    const topics = await this.getTopics(userId);
    
    if (topics.length === 0) return undefined;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const topicTimes: Record<number, number> = {};
    
    // Initialize topic times to 0
    topics.forEach(topic => {
      topicTimes[topic.id] = 0;
    });
    
    // Get all time entries for this month
    const entries = await this.getTimeEntries(userId, { 
      startDate: startOfMonth
    });
    
    // Calculate total time per topic
    entries.forEach(entry => {
      topicTimes[entry.topicId] = (topicTimes[entry.topicId] || 0) + entry.duration;
    });
    
    // Find topic with maximum time
    let maxTime = 0;
    let mostTrackedTopicId = 0;
    
    Object.entries(topicTimes).forEach(([topicId, time]) => {
      if (time > maxTime) {
        maxTime = time;
        mostTrackedTopicId = parseInt(topicId);
      }
    });
    
    const mostTrackedTopic = topics.find(t => t.id === mostTrackedTopicId);
    
    if (!mostTrackedTopic) return undefined;
    
    return {
      topic: mostTrackedTopic,
      totalTime: maxTime
    };
  }
  
  async getTopicDistribution(userId: number): Promise<TopicDistribution[]> {
    const topics = await this.getTopics(userId);
    
    if (topics.length === 0) return [];
    
    const topicMap = new Map<number, Topic>();
    topics.forEach(topic => topicMap.set(topic.id, topic));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all time entries for this month
    const entries = await this.getTimeEntries(userId, { 
      startDate: startOfMonth
    });
    
    // Calculate total time per topic
    const topicTimes: Record<number, number> = {};
    let totalTime = 0;
    
    entries.forEach(entry => {
      topicTimes[entry.topicId] = (topicTimes[entry.topicId] || 0) + entry.duration;
      totalTime += entry.duration;
    });
    
    if (totalTime === 0) {
      // Return empty data with 0% for each topic
      return topics.map(topic => ({
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color,
        duration: 0,
        percentage: 0
      }));
    }
    
    // Calculate percentages
    return Object.entries(topicTimes)
      .map(([topicId, duration]) => {
        const topic = topicMap.get(parseInt(topicId));
        
        if (!topic) return null; // Skip if topic not found
        
        return {
          topicId: topic.id,
          topicName: topic.name,
          topicColor: topic.color,
          duration,
          percentage: Math.round((duration / totalTime) * 100)
        };
      })
      .filter((item): item is TopicDistribution => item !== null)
      .sort((a, b) => b.percentage - a.percentage);
  }

  async getWeeklyOverview(userId: number): Promise<WeeklyData[]> {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Start from previous Sunday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
    
    const weeklyData: WeeklyData[] = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Initialize with 0 duration for each day
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      
      weeklyData.push({
        day: days[i],
        shortDay: shortDays[i],
        duration: 0
      });
    }
    
    // Get all entries for the week
    const entries = await this.getTimeEntries(userId, { 
      startDate
    });
    
    // Calculate total duration per day
    entries.forEach(entry => {
      const entryDay = entry.startTime.getDay();
      weeklyData[entryDay].duration += entry.duration;
    });
    
    return weeklyData;
  }

  async getRecentSessions(userId: number, limit: number = 4): Promise<TimeEntrySummary[]> {
    const entries = await this.getTimeEntries(userId, { limit });
    const topicsMap = new Map<number, Topic>();
    
    // Get all unique topics from the entries
    const topicIds = [...new Set(entries.map(entry => entry.topicId))];
    
    // Fetch all topics at once and create a map for faster lookup
    for (const topicId of topicIds) {
      const topic = await this.getTopic(topicId);
      if (topic) {
        topicsMap.set(topicId, topic);
      }
    }
    
    // Format the entries
    return entries.map(entry => {
      const topic = topicsMap.get(entry.topicId);
      
      if (!topic) {
        throw new Error(`Topic not found for id: ${entry.topicId}`);
      }
      
      const hours = Math.floor(entry.duration / 3600);
      const minutes = Math.floor((entry.duration % 3600) / 60);
      const formattedDuration = hours > 0 
        ? `${hours}h ${minutes}m` 
        : `${minutes}m`;
      
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      };
      
      const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
      };
      
      const isYesterday = (date: Date) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.getDate() === yesterday.getDate() &&
          date.getMonth() === yesterday.getMonth() &&
          date.getFullYear() === yesterday.getFullYear();
      };
      
      let formattedDate = entry.startTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (isToday(entry.startTime)) {
        formattedDate = 'Today';
      } else if (isYesterday(entry.startTime)) {
        formattedDate = 'Yesterday';
      }
      
      const timeRange = `${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}`;
      
      return {
        id: entry.id,
        topicId: topic.id,
        topicName: topic.name,
        topicColor: topic.color,
        description: entry.description || null,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        formattedDuration,
        formattedTimeRange: timeRange,
        formattedDate
      };
    });
  }
}

export const storage = new MemStorage();
