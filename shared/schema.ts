import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

// Topics schema
export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
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
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries);

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
};

export type TimeEntrySummary = {
  id: number;
  description: string | null;
  topic: Topic;
  date: string;
  timeRange: string;
  duration: string;
  durationSeconds: number;
};

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
