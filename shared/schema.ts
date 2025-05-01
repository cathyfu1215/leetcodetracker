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

// Define the problem schema
export const problemSchema = z.object({
  id: z.number(),
  leetcodeNumber: z.number().int().positive(),  // Added leetcodeNumber field
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

// Define the insert schema for the problems table
export const insertProblemSchema = problemSchema.omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

// Define types for use in the application
export type Problem = z.infer<typeof problemSchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
