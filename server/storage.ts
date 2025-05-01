import { problems, type Problem, type InsertProblem, users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  updateProblem(id: number, problem: Partial<InsertProblem>): Promise<Problem | undefined>;
  deleteProblem(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private problems: Map<number, Problem>;
  private userCurrentId: number;
  private problemCurrentId: number;

  constructor() {
    this.users = new Map();
    this.problems = new Map();
    this.userCurrentId = 1;
    this.problemCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Problem methods
  async getAllProblems(): Promise<Problem[]> {
    return Array.from(this.problems.values());
  }

  async getProblem(id: number): Promise<Problem | undefined> {
    return this.problems.get(id);
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    const id = this.problemCurrentId++;
    const now = new Date().toISOString();
    const problem: Problem = { 
      ...insertProblem, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.problems.set(id, problem);
    return problem;
  }

  async updateProblem(id: number, updateData: Partial<InsertProblem>): Promise<Problem | undefined> {
    const existingProblem = this.problems.get(id);
    if (!existingProblem) {
      return undefined;
    }

    const updatedProblem: Problem = {
      ...existingProblem,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    this.problems.set(id, updatedProblem);
    return updatedProblem;
  }

  async deleteProblem(id: number): Promise<boolean> {
    return this.problems.delete(id);
  }
}

export const storage = new MemStorage();
