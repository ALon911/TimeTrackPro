import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Type for active timers sharing with team
export interface ActiveTimer {
  userId: number;
  username: string;
  email: string;
  topicId: number;
  topicName: string;
  topicColor: string;
  description: string;
  startTime: string;
  estimatedEndTime: string | null;
  isPaused: boolean;
  pausedAt: string | null;
  duration: number | null;
}

// Users schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"), // Optional display name
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
});

// Teams schema (for group time tracking)
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  visibility: text("visibility").notNull().default("private"), // Options: private, public
  allowCrossCrewAccess: integer("allow_cross_crew_access", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  ownerId: true,
  visibility: true,
  allowCrossCrewAccess: true,
});

// Team members schema (relationship between users and teams)
export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // Options: owner, admin, member
  joinedAt: text("joined_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
});

// Team invitations schema (for pending invitations)
export const teamInvitations = sqliteTable("team_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull(),
  status: text("status").notNull().default("pending"),
  invitedBy: integer("invited_by")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  expiresAt: text("expires_at")
    .notNull()
    .$defaultFn(() => {
      const date = new Date();
      date.setDate(date.getDate() + 7); // Default expiration: 7 days
      return date.toISOString();
    }),
});

export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).pick({
  teamId: true,
  email: true,
  invitedBy: true,
  status: true,
  token: true,
});

// Topics schema
export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
});

export const insertTopicSchema = createInsertSchema(topics);

// Time entries schema
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  description: text("description"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  duration: integer("duration").notNull(), // Duration in seconds
  isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries);

// AI Suggestions schema
export const aiSuggestions = sqliteTable("ai_suggestions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // productivity, time_management, work_life_balance, goal_setting
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionable: text("actionable").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high
  confidence: integer("confidence").notNull(), // 0-100
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isApplied: integer("is_applied", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const insertAISuggestionSchema = createInsertSchema(aiSuggestions);

// Statistics types
export type TimeStat = {
  total: number;
  compareTotal: number;
  percentChange: number;
  increase: boolean;
};

export type TopicDistribution = {
  topic: Topic;
  percentage: number;
  totalTime: number;
};

export type WeeklyData = {
  day: string;
  dayOfWeek: string;
  totalDuration: number;
  totalTime: number; // לתאימות עם קוד קיים
  date: string;
};

export type TimeEntrySummary = {
  id: number;
  description: string | null;
  topic: Topic;
  date: string;
  timeRange: string;
  duration?: string;
  durationSeconds?: number;
};

// Team statistics types
export type TeamTimeStat = {
  teamId: number;
  teamName: string;
  membersCount: number;
  totalSeconds: number;
  breakdownByUser: {
    userId: number;
    email: string;
    seconds: number;
    percentage: number;
  }[];
};

export type TeamTopicDistribution = {
  topic: Topic;
  percentage: number;
  totalSeconds: number;
  breakdownByUser: {
    userId: number;
    email: string;
    seconds: number;
    percentage: number;
  }[];
};

export type TeamMemberActivity = {
  userId: number;
  email: string;
  totalSeconds: number;
  mostActiveHour: number;
  lastActiveDay: string;
};

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type AISuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAISuggestion = z.infer<typeof insertAISuggestionSchema>;
