import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the pattern schema
export const patternSchema = z.object({
  name: z.string(),
  description: z.string(),
});

// Define the trick schema
export const trickSchema = z.object({
  name: z.string(),
  description: z.string(),
});

// Define the example schema
export const exampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

// Difficulty enum
export const difficultyEnum = z.enum(["Easy", "Medium", "Hard"]);
export type Difficulty = z.infer<typeof difficultyEnum>;

// Define the users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Define the problems table
export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content").notNull(),
  constraints: jsonb("constraints").notNull().$type<string[]>(),
  examples: jsonb("examples").notNull().$type<z.infer<typeof exampleSchema>[]>(),
  patterns: jsonb("patterns").notNull().$type<z.infer<typeof patternSchema>[]>(),
  tricks: jsonb("tricks").notNull().$type<z.infer<typeof trickSchema>[]>(),
  notes: text("notes"),
  difficulty: text("difficulty").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Define the insert schema for the problems table using drizzle-zod
export const insertProblemSchema = createInsertSchema(problems)
  .omit({ id: true })
  .extend({
    constraints: z.array(z.string()),
    examples: z.array(exampleSchema),
    patterns: z.array(patternSchema),
    tricks: z.array(trickSchema),
    difficulty: difficultyEnum,
  });

// Define the problem type
export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;

// Insert user schema
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
