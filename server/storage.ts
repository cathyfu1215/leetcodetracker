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
    console.log("Fetching all problems from the database");
    const querySnapshot = await db.collection(PROBLEMS_COLLECTION).get();
    return querySnapshot.docs.map(doc => {
      return {
        leetcodeNumber: parseInt(doc.id), // Use leetcodeNumber as the unique identifier
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
    
    if (querySnapshot.empty) {
      console.log(`Problem with Leetcode number ${leetcodeNumber} not found in the database.`);
      return undefined;
    }
    
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

    const now = new Date().toISOString();
    const problem: Problem = { 
      ...insertProblem, 
      createdAt: now,
      updatedAt: now
    };

    // Use leetcodeNumber as the document ID
    await db.collection(PROBLEMS_COLLECTION).doc(insertProblem.leetcodeNumber.toString()).set(problem);
    return problem;
  }

  async updateProblem(leetcodeNumber: number, updateData: Partial<InsertProblem>): Promise<Problem | undefined> {
    const problemRef = db.collection(PROBLEMS_COLLECTION).doc(leetcodeNumber.toString());
    const problemDoc = await problemRef.get();

    if (!problemDoc.exists) return undefined;

    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await problemRef.update(updatedData);

    // Get the updated document
    const updatedDoc = await problemRef.get();
    return { leetcodeNumber, ...updatedDoc.data() } as Problem;
  }

  async deleteProblem(leetcodeNumber: number): Promise<boolean> {
    const problemRef = db.collection(PROBLEMS_COLLECTION).doc(leetcodeNumber.toString());
    const problemDoc = await problemRef.get();

    if (!problemDoc.exists) return false;

    await problemRef.delete();
    return true;
  }
}

// Export a singleton instance for use throughout the application
export const storage = new FirebaseStorage();
