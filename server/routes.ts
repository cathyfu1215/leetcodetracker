import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProblemSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all problems
  app.get("/api/problems", async (_req: Request, res: Response) => {
    try {
      const problems = await storage.getAllProblems();
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  // Get a specific problem by ID
  app.get("/api/problems/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid problem ID" });
      }

      console.log("Fetching problem by ID:", id);

      const problem = await storage.getProblem(id);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }

      res.json(problem);
    } catch (error) {
      console.error("Error fetching problem:", error);
      res.status(500).json({ message: "Failed to fetch problem" });
    }
  });

  // Get a specific problem by Leetcode number
  app.get("/api/problems/by-leetcode/:leetcodeNumber", async (req: Request, res: Response) => {
    try {
      const leetcodeNumber = parseInt(req.params.leetcodeNumber);
      if (isNaN(leetcodeNumber)) {
        return res.status(400).json({ message: "Invalid Leetcode number" });
      }

      const problem = await storage.getProblemByLeetcodeNumber(leetcodeNumber);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }

      res.json(problem);
    } catch (error) {
      console.error("Error fetching problem:", error);
      res.status(500).json({ message: "Failed to fetch problem" });
    }
  });

  // Create a new problem
  app.post("/api/problems", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProblemSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid problem data", 
          errors: validationError.details 
        });
      }

      const newProblem = await storage.createProblem(validatedData.data);
      res.status(201).json(newProblem);
    } catch (error) {
      console.error("Error creating problem:", error);
      res.status(500).json({ message: "Failed to create problem" });
    }
  });

  // Update an existing problem
  app.patch("/api/problems/:leetcodeNumber", async (req: Request, res: Response) => {
    try {
      const leetcodeNumber = parseInt(req.params.leetcodeNumber);
      if (isNaN(leetcodeNumber)) {
        return res.status(400).json({ message: "Invalid problem Leetcode number" });
      }

      // Validate the update data
      const validatedData = insertProblemSchema.partial().safeParse(req.body);

      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid problem data", 
          errors: validationError.details 
        });
      }

      const updatedProblem = await storage.updateProblem(leetcodeNumber, validatedData.data);
      if (!updatedProblem) {
        return res.status(404).json({ message: "Problem not found" });
      }

      res.json(updatedProblem);
    } catch (error) {
      console.error("Error updating problem:", error);
      res.status(500).json({ message: "Failed to update problem" });
    }
  });

  // Delete a problem
  app.delete("/api/problems/:leetcodeNumber", async (req: Request, res: Response) => {
    try {
      const leetcodeNumber = parseInt(req.params.leetcodeNumber);
      if (isNaN(leetcodeNumber)) {
        return res.status(400).json({ message: "Invalid problem Leetcode number" });
      }

      const deleted = await storage.deleteProblem(leetcodeNumber);
      if (!deleted) {
        return res.status(404).json({ message: "Problem not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting problem:", error);
      res.status(500).json({ message: "Failed to delete problem" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
