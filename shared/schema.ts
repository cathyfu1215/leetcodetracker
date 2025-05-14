import { z } from "zod";

// Problem reference schema for pattern and trick documents
export const problemReferenceSchema = z.object({
  leetcodeNumber: z.number().int().positive(),
  title: z.string(),
});

// Define the pattern schema
export const patternSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  usageCount: z.number().optional(),
  problems: z.array(problemReferenceSchema).optional(),
});

// Define the trick schema
export const trickSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  usageCount: z.number().optional(),
  problems: z.array(problemReferenceSchema).optional(),
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

// Pattern reference schema for problem documents
export const patternReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

// Trick reference schema for problem documents
export const trickReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

// Removed the `id` field from the problem schema and updated the `leetcodeNumber` to serve as the unique identifier
export const problemSchema = z.object({
  leetcodeNumber: z.number().int().positive(),  // Use leetcodeNumber as the unique identifier
  title: z.string(),
  url: z.string(),
  content: z.string(),
  constraints: z.array(z.string()),
  examples: z.array(exampleSchema),
  patterns: z.array(patternReferenceSchema),
  tricks: z.array(trickReferenceSchema),
  notes: z.string().nullable().optional(),
  difficulty: difficultyEnum,
  isStarred: z.boolean().default(false).optional(),
  isCompleted: z.boolean().default(false).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Updated the insert schema for the problems table
export const insertProblemSchema = problemSchema.omit({ 
  createdAt: true,
  updatedAt: true
});

// Schemas for creating/updating standalone patterns and tricks
export const insertPatternSchema = patternSchema.omit({ id: true, usageCount: true });
export const insertTrickSchema = trickSchema.omit({ id: true, usageCount: true });

// Define types for use in the application
export type Problem = z.infer<typeof problemSchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pattern = z.infer<typeof patternSchema>;
export type InsertPattern = z.infer<typeof insertPatternSchema>;
export type Trick = z.infer<typeof trickSchema>;
export type InsertTrick = z.infer<typeof insertTrickSchema>;
export type PatternReference = z.infer<typeof patternReferenceSchema>;
export type TrickReference = z.infer<typeof trickReferenceSchema>;
export type ProblemReference = z.infer<typeof problemReferenceSchema>;
