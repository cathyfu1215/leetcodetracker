import { db } from './firebase';
import { Problem, type InsertProblem, type User, type InsertUser } from "@shared/schema";

// Firebase Collection Names
const USERS_COLLECTION = 'users';
const PROBLEMS_COLLECTION = 'problems';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  getProblemByLeetcodeNumber(leetcodeNumber: number): Promise<Problem | undefined>; // New method
  createProblem(problem: InsertProblem): Promise<Problem>;
  updateProblem(id: number, problem: Partial<InsertProblem>): Promise<Problem | undefined>;
  deleteProblem(id: number): Promise<boolean>;
}

export class FirebaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const userDoc = await db.collection(USERS_COLLECTION).doc(id.toString()).get();
    if (!userDoc.exists) return undefined;
    return { id, ...userDoc.data() } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const querySnapshot = await db.collection(USERS_COLLECTION)
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) return undefined;
    
    const userDoc = querySnapshot.docs[0];
    return {
      id: parseInt(userDoc.id),
      ...userDoc.data()
    } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Get the next ID by counting documents (not ideal for production)
    const countSnapshot = await db.collection(USERS_COLLECTION).get();
    const id = countSnapshot.size + 1;
    
    const user: User = { ...insertUser, id };
    
    await db.collection(USERS_COLLECTION).doc(id.toString()).set(user);
    return user;
  }

  // Problem methods
  async getAllProblems(): Promise<Problem[]> {
    const querySnapshot = await db.collection(PROBLEMS_COLLECTION).get();
    return querySnapshot.docs.map(doc => {
      return {
        id: parseInt(doc.id),
        ...doc.data()
      } as Problem;
    });
  }

  async getProblem(id: number): Promise<Problem | undefined> {
    const problemDoc = await db.collection(PROBLEMS_COLLECTION).doc(id.toString()).get();
    if (!problemDoc.exists) return undefined;
    return { id, ...problemDoc.data() } as Problem;
  }

  // New method to get problem by leetcode number
  async getProblemByLeetcodeNumber(leetcodeNumber: number): Promise<Problem | undefined> {
    const querySnapshot = await db.collection(PROBLEMS_COLLECTION)
      .where('leetcodeNumber', '==', leetcodeNumber)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) return undefined;
    
    const problemDoc = querySnapshot.docs[0];
    return {
      id: parseInt(problemDoc.id),
      ...problemDoc.data()
    } as Problem;
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    // Check if problem with the same leetcode number already exists
    const existingProblem = await this.getProblemByLeetcodeNumber(insertProblem.leetcodeNumber);
    if (existingProblem) {
      throw new Error(`Problem with Leetcode number ${insertProblem.leetcodeNumber} already exists`);
    }
    
    // Get the next ID by counting documents (not ideal for production)
    const countSnapshot = await db.collection(PROBLEMS_COLLECTION).get();
    const id = countSnapshot.size + 1;
    
    const now = new Date().toISOString();
    const problem: Problem = { 
      ...insertProblem, 
      id,
      createdAt: now,
      updatedAt: now
    };
    
    await db.collection(PROBLEMS_COLLECTION).doc(id.toString()).set(problem);
    return problem;
  }

  async updateProblem(id: number, updateData: Partial<InsertProblem>): Promise<Problem | undefined> {
    const problemRef = db.collection(PROBLEMS_COLLECTION).doc(id.toString());
    const problemDoc = await problemRef.get();
    
    if (!problemDoc.exists) return undefined;
    
    // If updating leetcodeNumber, check if it's unique
    if (updateData.leetcodeNumber !== undefined) {
      const existingProblem = await this.getProblemByLeetcodeNumber(updateData.leetcodeNumber);
      if (existingProblem && existingProblem.id !== id) {
        throw new Error(`Problem with Leetcode number ${updateData.leetcodeNumber} already exists`);
      }
    }
    
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await problemRef.update(updatedData);
    
    // Get the updated document
    const updatedDoc = await problemRef.get();
    return { id, ...updatedDoc.data() } as Problem;
  }

  async deleteProblem(id: number): Promise<boolean> {
    const problemRef = db.collection(PROBLEMS_COLLECTION).doc(id.toString());
    const problemDoc = await problemRef.get();
    
    if (!problemDoc.exists) return false;
    
    await problemRef.delete();
    return true;
  }
}

// Export a singleton instance for use throughout the application
export const storage = new FirebaseStorage();
