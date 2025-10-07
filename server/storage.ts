import { 
  User, 
  InsertUser, 
  Topic, 
  InsertTopic, 
  TimeEntry, 
  InsertTimeEntry,
  TimeStat,
  TopicDistribution,
  WeeklyData,
  TimeEntrySummary,
  Team,
  InsertTeam,
  TeamMember,
  InsertTeamMember,
  TeamInvitation,
  InsertTeamInvitation,
  TeamTimeStat,
  TeamTopicDistribution,
  TeamMemberActivity,
  AISuggestion,
  InsertAISuggestion
} from "@shared/schema";
import session from "express-session";

export interface TimeEntryFilters {
  topicId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface IStorage {
  db?: any; // Access to database object for debugging
  
  // Database health and regeneration methods
  isDatabaseHealthy(): boolean;
  regenerateDatabase(): Promise<void>;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Kept for backward compatibility
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<{ email: string; displayName: string }>): Promise<User | undefined>;
  updateUserPassword(id: number, newPasswordHash: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  
  // Topic methods
  getTopics(userId: number): Promise<Topic[]>;
  getTopic(id: number): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, topic: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<boolean>;
  getTeamTopics(teamId: number): Promise<Topic[]>;
  
  // Time entry methods
  getTimeEntries(userId: number, filters?: TimeEntryFilters): Promise<TimeEntry[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;
  deleteAllTimeEntries(userId: number): Promise<boolean>;
  
  // Statistics methods
  getDailyStats(userId: number): Promise<TimeStat>;
  getWeeklyStats(userId: number): Promise<TimeStat>;
  getMostTrackedTopic(userId: number): Promise<{ topic: Topic; totalTime: number } | undefined>;
  getTopicDistribution(userId: number): Promise<TopicDistribution[]>;
  getWeeklyOverview(userId: number): Promise<WeeklyData[]>;
  getRecentSessions(userId: number, limit?: number): Promise<TimeEntrySummary[]>;
  
  // Team methods
  getTeams(userId: number): Promise<Team[]>;
  getAllTeams(userId: number): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, teamData: Partial<{ name: string }>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Team admin methods
  hasTeamAdmin(teamId: number): Promise<boolean>;
  getTeamAdmins(teamId: number): Promise<(TeamMember & { user: User })[]>;
  
  // Team members methods
  getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]>;
  addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<boolean>;
  updateTeamMemberRole(teamId: number, userId: number, role: string): Promise<TeamMember | undefined>;
  
  // Team invitations methods
  createTeamInvitation(invitation: InsertTeamInvitation & { token: string }): Promise<TeamInvitation>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  getTeamInvitationById(id: number): Promise<TeamInvitation | undefined>;
  getTeamInvitationsByEmail(email: string): Promise<TeamInvitation[]>;
  getTeamInvitationsByTeam(teamId: number): Promise<TeamInvitation[]>;
  updateTeamInvitationStatus(id: number, status: string): Promise<TeamInvitation | undefined>;
  
  // Team statistics methods
  getTeamStats(teamId: number): Promise<TeamTimeStat>;
  getTeamTopicDistribution(teamId: number): Promise<TeamTopicDistribution[]>;
  getTeamMemberActivity(teamId: number): Promise<TeamMemberActivity[]>;
  
  // AI Suggestions methods
  getAISuggestions(userId: number, limit?: number): Promise<AISuggestion[]>;
  getAISuggestion(id: string): Promise<AISuggestion | undefined>;
  createAISuggestion(suggestion: InsertAISuggestion): Promise<AISuggestion>;
  updateAISuggestion(id: string, updates: Partial<{ isRead: boolean; isApplied: boolean }>): Promise<AISuggestion | undefined>;
  deleteAISuggestion(id: string): Promise<boolean>;
  getRecentAISuggestions(userId: number, hours?: number): Promise<AISuggestion[]>;
  
  // Session store
  sessionStore: session.Store;
}

// Import the actual storage implementation
import { DatabaseStorage } from './database-storage';

// Export the storage instance
export const storage = new DatabaseStorage();
