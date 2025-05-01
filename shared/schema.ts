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

// Define the user schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
});

// Insert user schema
export const insertUserSchema = userSchema.omit({ id: true });

// Removed the `id` field from the problem schema and updated the `leetcodeNumber` to serve as the unique identifier
export const problemSchema = z.object({
  leetcodeNumber: z.number().int().positive(),  // Use leetcodeNumber as the unique identifier
  title: z.string(),
  url: z.string(),
  content: z.string(),
  constraints: z.array(z.string()),
  examples: z.array(exampleSchema),
  patterns: z.array(patternSchema),
  tricks: z.array(trickSchema),
  notes: z.string().nullable().optional(),
  difficulty: difficultyEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Updated the insert schema for the problems table
export const insertProblemSchema = problemSchema.omit({ 
  createdAt: true,
  updatedAt: true
});

// Define types for use in the application
export type Problem = z.infer<typeof problemSchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
