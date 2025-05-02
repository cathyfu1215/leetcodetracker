import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import { insertProblemSchema, insertPatternSchema, insertTrickSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create separate routers for problems, patterns, and tricks
  const problemsRouter = express.Router();
  const patternsRouter = express.Router();
  const tricksRouter = express.Router();
  
  // PROBLEMS ROUTES
  
  // Get all problems
  problemsRouter.get("/", async (_req: Request, res: Response) => {
    try {
      const problems = await storage.getAllProblems();
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });

  // Get problem by leetcode number
  problemsRouter.get("/by-leetcode/:leetcodeNumber", async (req: Request, res: Response) => {
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
  problemsRouter.post("/", async (req: Request, res: Response) => {
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

  // Get a specific problem by ID
  problemsRouter.get("/:id", async (req: Request, res: Response) => {
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

  // Update an existing problem
  problemsRouter.patch("/:leetcodeNumber", async (req: Request, res: Response) => {
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
  problemsRouter.delete("/:leetcodeNumber", async (req: Request, res: Response) => {
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

  // PATTERN ROUTES
  
  // Get all patterns
  patternsRouter.get("/", async (_req: Request, res: Response) => {
    try {
      const patterns = await storage.getAllPatterns();
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching patterns:", error);
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });
  
  // IMPORTANT: Define specific routes before parameterized routes
  // Search patterns - MUST be before /:id routes
  patternsRouter.get("/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || "";
      console.log("Searching patterns with query:", query);
      const patterns = await storage.searchPatterns(query);
      res.json(patterns);
    } catch (error) {
      console.error("Error searching patterns:", error);
      res.status(500).json({ message: "Failed to search patterns" });
    }
  });
  
  // Create a new pattern
  patternsRouter.post("/", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPatternSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid pattern data", 
          errors: validationError.details 
        });
      }

      const newPattern = await storage.createPattern(validatedData.data);
      res.status(201).json(newPattern);
    } catch (error) {
      console.error("Error creating pattern:", error);
      res.status(500).json({ message: "Failed to create pattern" });
    }
  });

  // IMPORTANT: Make /:id/problems route explicit to avoid conflicts
  // Get problems for a specific pattern - Has a specific path parameter format
  patternsRouter.get("/:id/problems", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log("Fetching problems for pattern ID:", id);
      
      // Special handling for search path to avoid conflicts
      if (id === "search") {
        return res.status(400).json({ message: "Invalid pattern ID: 'search' is a reserved word" });
      }
      
      const problems = await storage.getProblemsForPattern(id);
      console.log(`Found ${problems.length} problems for pattern ${id}`);
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems for pattern:", error);
      res.status(500).json({ message: "Failed to fetch problems for pattern" });
    }
  });
  
  // Update an existing pattern
  patternsRouter.patch("/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      // Validate the update data
      const validatedData = insertPatternSchema.partial().safeParse(req.body);

      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid pattern data", 
          errors: validationError.details 
        });
      }

      const updatedPattern = await storage.updatePattern(id, validatedData.data);
      if (!updatedPattern) {
        return res.status(404).json({ message: "Pattern not found" });
      }

      res.json(updatedPattern);
    } catch (error) {
      console.error("Error updating pattern:", error);
      res.status(500).json({ message: "Failed to update pattern" });
    }
  });
  
  // Update pattern-problem connection
  patternsRouter.patch("/:id/problems", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, problem, leetcodeNumber } = req.body;
      
      // Validate input
      if (!id) {
        return res.status(400).json({ error: "Pattern ID is required" });
      }

      if (action !== "add" && action !== "remove") {
        return res.status(400).json({ error: "Invalid action. Use 'add' or 'remove'" });
      }

      const result = action === "add"
        ? await storage.addProblemToPattern(id, problem)
        : await storage.removeProblemFromPattern(id, leetcodeNumber);

      if (!result) {
        return res.status(404).json({ error: "Pattern not found or update failed" });
      }

      res.status(200).json({ message: `Problem ${action === "add" ? "added to" : "removed from"} pattern successfully` });
    } catch (error) {
      console.error("Error updating pattern problems:", error);
      res.status(500).json({ error: "Failed to update pattern" });
    }
  });
  
  // Get a specific pattern - Ensure this is the LAST route defined
  patternsRouter.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log("Fetching pattern with ID:", id);
      
      // Special handling for search path to avoid conflicts
      if (id === "search") {
        return res.status(400).json({ message: "Invalid pattern ID: 'search' is a reserved word" });
      }
      
      const pattern = await storage.getPatternById(id);
      
      if (!pattern) {
        console.log(`Pattern with ID ${id} not found`);
        return res.status(404).json({ message: "Pattern not found" });
      }
      
      console.log("Pattern found:", pattern);
      res.json(pattern);
    } catch (error) {
      console.error("Error fetching pattern:", error);
      res.status(500).json({ message: "Failed to fetch pattern" });
    }
  });

  // TRICK ROUTES
  
  // Get all tricks
  tricksRouter.get("/", async (_req: Request, res: Response) => {
    try {
      const tricks = await storage.getAllTricks();
      res.json(tricks);
    } catch (error) {
      console.error("Error fetching tricks:", error);
      res.status(500).json({ message: "Failed to fetch tricks" });
    }
  });
  
  // IMPORTANT: Define specific routes before parameterized routes
  // Search tricks - MUST be before /:id routes
  tricksRouter.get("/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || "";
      console.log("Searching tricks with query:", query);
      const tricks = await storage.searchTricks(query);
      res.json(tricks);
    } catch (error) {
      console.error("Error searching tricks:", error);
      res.status(500).json({ message: "Failed to search tricks" });
    }
  });
  
  // Create a new trick
  tricksRouter.post("/", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTrickSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid trick data", 
          errors: validationError.details 
        });
      }

      const newTrick = await storage.createTrick(validatedData.data);
      res.status(201).json(newTrick);
    } catch (error) {
      console.error("Error creating trick:", error);
      res.status(500).json({ message: "Failed to create trick" });
    }
  });
  
  // IMPORTANT: Make /:id/problems route explicit to avoid conflicts
  // Get problems for a specific trick - Has a specific path parameter format
  tricksRouter.get("/:id/problems", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log("Fetching problems for trick ID:", id);
      
      // Special handling for search path to avoid conflicts
      if (id === "search") {
        return res.status(400).json({ message: "Invalid trick ID: 'search' is a reserved word" });
      }
      
      const problems = await storage.getProblemsForTrick(id);
      console.log(`Found ${problems.length} problems for trick ${id}`);
      res.json(problems);
    } catch (error) {
      console.error("Error fetching problems for trick:", error);
      res.status(500).json({ message: "Failed to fetch problems for trick" });
    }
  });
  
  // Update an existing trick
  tricksRouter.patch("/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      // Validate the update data
      const validatedData = insertTrickSchema.partial().safeParse(req.body);

      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ 
          message: "Invalid trick data", 
          errors: validationError.details 
        });
      }

      const updatedTrick = await storage.updateTrick(id, validatedData.data);
      if (!updatedTrick) {
        return res.status(404).json({ message: "Trick not found" });
      }

      res.json(updatedTrick);
    } catch (error) {
      console.error("Error updating trick:", error);
      res.status(500).json({ message: "Failed to update trick" });
    }
  });
  
  // Update trick-problem connection
  tricksRouter.patch("/:id/problems", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, problem, leetcodeNumber } = req.body;
      
      // Validate input
      if (!id) {
        return res.status(400).json({ error: "Trick ID is required" });
      }

      if (action !== "add" && action !== "remove") {
        return res.status(400).json({ error: "Invalid action. Use 'add' or 'remove'" });
      }

      const result = action === "add"
        ? await storage.addProblemToTrick(id, problem)
        : await storage.removeProblemFromTrick(id, leetcodeNumber);

      if (!result) {
        return res.status(404).json({ error: "Trick not found or update failed" });
      }

      res.status(200).json({ message: `Problem ${action === "add" ? "added to" : "removed from"} trick successfully` });
    } catch (error) {
      console.error("Error updating trick problems:", error);
      res.status(500).json({ error: "Failed to update trick" });
    }
  });
  
  // Get a specific trick - Ensure this is the LAST route defined
  tricksRouter.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log("Fetching trick with ID:", id);
      
      // Special handling for search path to avoid conflicts
      if (id === "search") {
        return res.status(400).json({ message: "Invalid trick ID: 'search' is a reserved word" });
      }
      
      const trick = await storage.getTrickById(id);
      
      if (!trick) {
        console.log(`Trick with ID ${id} not found`);
        return res.status(404).json({ message: "Trick not found" });
      }
      
      console.log("Trick found:", trick);
      res.json(trick);
    } catch (error) {
      console.error("Error fetching trick:", error);
      res.status(500).json({ message: "Failed to fetch trick" });
    }
  });
  
  // Register all routes with main app
  app.use("/api/problems", problemsRouter);
  app.use("/api/patterns", patternsRouter);
  app.use("/api/tricks", tricksRouter);

  const httpServer = createServer(app);
  return httpServer;
}
