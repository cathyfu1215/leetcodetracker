import { db } from './firebase';
import { 
  Problem, 
  type InsertProblem,
  type User, 
  type InsertUser, 
  type Pattern,
  type InsertPattern,
  type Trick,
  type InsertTrick,
  type PatternReference,
  type TrickReference,
  type ProblemReference
} from "@shared/schema";

// Firebase Collection Names
const USERS_COLLECTION = 'users';
const PROBLEMS_COLLECTION = 'problems';
const PATTERNS_COLLECTION = 'patterns';
const TRICKS_COLLECTION = 'tricks';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Problem methods
  getAllProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  getProblemByLeetcodeNumber(leetcodeNumber: number): Promise<Problem | undefined>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  updateProblem(id: number, problem: Partial<InsertProblem>): Promise<Problem | undefined>;
  deleteProblem(id: number): Promise<boolean>;

  // Pattern methods
  getAllPatterns(): Promise<Pattern[]>;
  getPatternById(id: string): Promise<Pattern | undefined>;
  searchPatterns(query: string): Promise<Pattern[]>;
  createPattern(pattern: InsertPattern): Promise<Pattern>;
  updatePattern(id: string, pattern: Partial<InsertPattern>): Promise<Pattern | undefined>;
  incrementPatternUsage(id: string): Promise<void>;
  getProblemsForPattern(patternId: string): Promise<Problem[]>;
  addProblemToPattern(patternId: string, problem: Problem): Promise<void>;
  removeProblemFromPattern(patternId: string, leetcodeNumber: number): Promise<void>;

  // Trick methods
  getAllTricks(): Promise<Trick[]>;
  getTrickById(id: string): Promise<Trick | undefined>;
  searchTricks(query: string): Promise<Trick[]>;
  createTrick(trick: InsertTrick): Promise<Trick>;
  updateTrick(id: string, trick: Partial<InsertTrick>): Promise<Trick | undefined>;
  incrementTrickUsage(id: string): Promise<void>;
  getProblemsForTrick(trickId: string): Promise<Problem[]>;
  addProblemToTrick(trickId: string, problem: Problem): Promise<void>;
  removeProblemFromTrick(trickId: string, leetcodeNumber: number): Promise<void>;
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

    // Update usage count for patterns and tricks and track problem references
    for (const pattern of insertProblem.patterns) {
      if (pattern.id) {
        await this.incrementPatternUsage(pattern.id);
        await this.addProblemToPattern(pattern.id, problem);
      }
    }

    for (const trick of insertProblem.tricks) {
      if (trick.id) {
        await this.incrementTrickUsage(trick.id);
        await this.addProblemToTrick(trick.id, problem);
      }
    }

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

    // Get the original problem to compare patterns and tricks
    const originalProblem = { leetcodeNumber, ...problemDoc.data() } as Problem;
    
    await problemRef.update(updatedData);
    
    // Get the updated problem data to use for references
    const updatedProblemDoc = await problemRef.get();
    const updatedProblem = { leetcodeNumber, ...updatedProblemDoc.data() } as Problem;

    // Update usage counts and problem references for patterns and tricks if they were updated
    if (updateData.patterns) {
      // Handle patterns that were removed
      for (const oldPattern of originalProblem.patterns) {
        const stillExists = updateData.patterns.some(p => p.id === oldPattern.id);
        if (!stillExists && oldPattern.id) {
          await this.removeProblemFromPattern(oldPattern.id, leetcodeNumber);
        }
      }
      
      // Handle patterns that were added
      const newPatterns = updateData.patterns.filter(
        newPattern => !originalProblem.patterns.some(original => original.id === newPattern.id)
      );
      
      // Increment usage and add problem reference for new patterns
      for (const pattern of newPatterns) {
        if (pattern.id) {
          await this.incrementPatternUsage(pattern.id);
          await this.addProblemToPattern(pattern.id, updatedProblem);
        }
      }
    }

    if (updateData.tricks) {
      // Handle tricks that were removed
      for (const oldTrick of originalProblem.tricks) {
        const stillExists = updateData.tricks.some(t => t.id === oldTrick.id);
        if (!stillExists && oldTrick.id) {
          await this.removeProblemFromTrick(oldTrick.id, leetcodeNumber);
        }
      }
      
      // Handle tricks that were added
      const newTricks = updateData.tricks.filter(
        newTrick => !originalProblem.tricks.some(original => original.id === newTrick.id)
      );
      
      // Increment usage and add problem reference for new tricks
      for (const trick of newTricks) {
        if (trick.id) {
          await this.incrementTrickUsage(trick.id);
          await this.addProblemToTrick(trick.id, updatedProblem);
        }
      }
    }

    return updatedProblem;
  }

  async deleteProblem(leetcodeNumber: number): Promise<boolean> {
    const problemRef = db.collection(PROBLEMS_COLLECTION).doc(leetcodeNumber.toString());
    const problemDoc = await problemRef.get();

    if (!problemDoc.exists) return false;

    // Get the problem data to remove references
    const problem = { leetcodeNumber, ...problemDoc.data() } as Problem;
    
    // Remove problem references from all patterns and tricks
    for (const pattern of problem.patterns) {
      if (pattern.id) {
        await this.removeProblemFromPattern(pattern.id, leetcodeNumber);
      }
    }
    
    for (const trick of problem.tricks) {
      if (trick.id) {
        await this.removeProblemFromTrick(trick.id, leetcodeNumber);
      }
    }

    await problemRef.delete();
    return true;
  }

  // Pattern methods
  async getAllPatterns(): Promise<Pattern[]> {
    const querySnapshot = await db.collection(PATTERNS_COLLECTION).get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pattern[];
  }

  async getPatternById(id: string): Promise<Pattern | undefined> {
    const patternDoc = await db.collection(PATTERNS_COLLECTION).doc(id).get();
    if (!patternDoc.exists) return undefined;
    return { id, ...patternDoc.data() } as Pattern;
  }

  async searchPatterns(query: string): Promise<Pattern[]> {
    // Firebase doesn't support full text search natively, so we'll do a simple startsWith query
    // In a production app, you might want to use a service like Algolia or Elasticsearch
    const queryLower = query.toLowerCase();
    
    const querySnapshot = await db.collection(PATTERNS_COLLECTION)
      .orderBy('name')
      .startAt(queryLower)
      .endAt(queryLower + '\uf8ff')
      .get();
    
    // Also get exact matches anywhere in the name
    const exactMatchSnapshot = await db.collection(PATTERNS_COLLECTION).get();
    
    const startWithResults = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Pattern[];
    
    const exactMatchResults = exactMatchSnapshot.docs
      .filter(doc => doc.data().name.toLowerCase().includes(queryLower))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pattern[];
    
    // Combine results and remove duplicates
    const combinedResults = [...startWithResults];
    for (const result of exactMatchResults) {
      if (!combinedResults.some(item => item.id === result.id)) {
        combinedResults.push(result);
      }
    }
    
    return combinedResults;
  }

  async createPattern(pattern: InsertPattern): Promise<Pattern> {
    // Check for existing pattern with the same name
    const querySnapshot = await db.collection(PATTERNS_COLLECTION)
      .where('name', '==', pattern.name)
      .limit(1)
      .get();
      
    if (!querySnapshot.empty) {
      // Pattern with this name already exists
      const existingPattern = querySnapshot.docs[0];
      return { id: existingPattern.id, ...existingPattern.data() } as Pattern;
    }
    
    // Create a new pattern
    const patternWithUsage = { ...pattern, usageCount: 1 };
    const docRef = await db.collection(PATTERNS_COLLECTION).add(patternWithUsage);
    return { id: docRef.id, ...patternWithUsage };
  }

  async updatePattern(id: string, updateData: Partial<InsertPattern>): Promise<Pattern | undefined> {
    const patternRef = db.collection(PATTERNS_COLLECTION).doc(id);
    const patternDoc = await patternRef.get();

    if (!patternDoc.exists) return undefined;

    await patternRef.update(updateData);

    // Get the updated document
    const updatedDoc = await patternRef.get();
    return { id, ...updatedDoc.data() } as Pattern;
  }

  async incrementPatternUsage(id: string): Promise<void> {
    const patternRef = db.collection(PATTERNS_COLLECTION).doc(id);
    await db.runTransaction(async (transaction) => {
      const patternDoc = await transaction.get(patternRef);
      if (!patternDoc.exists) return;
      
      const currentUsage = patternDoc.data()?.usageCount || 0;
      transaction.update(patternRef, { usageCount: currentUsage + 1 });
    });
  }

  async getProblemsForPattern(patternId: string): Promise<Problem[]> {
    const patternDoc = await db.collection(PATTERNS_COLLECTION).doc(patternId).get();
    if (!patternDoc.exists) return [];
    
    const pattern = { id: patternId, ...patternDoc.data() } as Pattern;
    const problemReferences = pattern.problems || [];
    
    // Get all problems referenced by this pattern
    const problems: Problem[] = [];
    for (const reference of problemReferences) {
      const problemDoc = await db.collection(PROBLEMS_COLLECTION).doc(reference.leetcodeNumber.toString()).get();
      if (problemDoc.exists) {
        problems.push({ 
          leetcodeNumber: reference.leetcodeNumber, 
          ...problemDoc.data() 
        } as Problem);
      }
    }
    
    return problems;
  }

  async addProblemToPattern(patternId: string, problem: Problem): Promise<void> {
    const patternRef = db.collection(PATTERNS_COLLECTION).doc(patternId);
    
    await db.runTransaction(async (transaction) => {
      const patternDoc = await transaction.get(patternRef);
      if (!patternDoc.exists) return;
      
      const pattern = patternDoc.data() as Pattern;
      const problems = pattern.problems || [];
      
      // Check if the problem is already referenced
      const exists = problems.some(p => p.leetcodeNumber === problem.leetcodeNumber);
      if (exists) return;
      
      // Add the problem reference
      const problemReference: ProblemReference = {
        leetcodeNumber: problem.leetcodeNumber,
        title: problem.title
      };
      
      transaction.update(patternRef, { 
        problems: [...problems, problemReference] 
      });
    });
  }

  async removeProblemFromPattern(patternId: string, leetcodeNumber: number): Promise<void> {
    const patternRef = db.collection(PATTERNS_COLLECTION).doc(patternId);
    
    await db.runTransaction(async (transaction) => {
      const patternDoc = await transaction.get(patternRef);
      if (!patternDoc.exists) return;
      
      const pattern = patternDoc.data() as Pattern;
      const problems = pattern.problems || [];
      
      // Filter out the problem reference to remove
      const updatedProblems = problems.filter(p => p.leetcodeNumber !== leetcodeNumber);
      
      transaction.update(patternRef, { problems: updatedProblems });
      
      // If no more problems use this pattern, decrease usage count
      if (updatedProblems.length < problems.length) {
        const currentUsage = pattern.usageCount || 0;
        if (currentUsage > 0) {
          transaction.update(patternRef, { usageCount: currentUsage - 1 });
        }
      }
    });
  }

  // Trick methods
  async getAllTricks(): Promise<Trick[]> {
    const querySnapshot = await db.collection(TRICKS_COLLECTION).get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trick[];
  }

  async getTrickById(id: string): Promise<Trick | undefined> {
    const trickDoc = await db.collection(TRICKS_COLLECTION).doc(id).get();
    if (!trickDoc.exists) return undefined;
    return { id, ...trickDoc.data() } as Trick;
  }

  async searchTricks(query: string): Promise<Trick[]> {
    // Firebase doesn't support full text search natively, so we'll do a simple startsWith query
    // In a production app, you might want to use a service like Algolia or Elasticsearch
    const queryLower = query.toLowerCase();
    
    const querySnapshot = await db.collection(TRICKS_COLLECTION)
      .orderBy('name')
      .startAt(queryLower)
      .endAt(queryLower + '\uf8ff')
      .get();
    
    // Also get exact matches anywhere in the name
    const exactMatchSnapshot = await db.collection(TRICKS_COLLECTION).get();
    
    const startWithResults = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Trick[];
    
    const exactMatchResults = exactMatchSnapshot.docs
      .filter(doc => doc.data().name.toLowerCase().includes(queryLower))
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Trick[];
    
    // Combine results and remove duplicates
    const combinedResults = [...startWithResults];
    for (const result of exactMatchResults) {
      if (!combinedResults.some(item => item.id === result.id)) {
        combinedResults.push(result);
      }
    }
    
    return combinedResults;
  }

  async createTrick(trick: InsertTrick): Promise<Trick> {
    // Check for existing trick with the same name
    const querySnapshot = await db.collection(TRICKS_COLLECTION)
      .where('name', '==', trick.name)
      .limit(1)
      .get();
      
    if (!querySnapshot.empty) {
      // Trick with this name already exists
      const existingTrick = querySnapshot.docs[0];
      return { id: existingTrick.id, ...existingTrick.data() } as Trick;
    }
    
    // Create a new trick
    const trickWithUsage = { ...trick, usageCount: 1 };
    const docRef = await db.collection(TRICKS_COLLECTION).add(trickWithUsage);
    return { id: docRef.id, ...trickWithUsage };
  }

  async updateTrick(id: string, updateData: Partial<InsertTrick>): Promise<Trick | undefined> {
    const trickRef = db.collection(TRICKS_COLLECTION).doc(id);
    const trickDoc = await trickRef.get();

    if (!trickDoc.exists) return undefined;

    await trickRef.update(updateData);

    // Get the updated document
    const updatedDoc = await trickRef.get();
    return { id, ...updatedDoc.data() } as Trick;
  }

  async incrementTrickUsage(id: string): Promise<void> {
    const trickRef = db.collection(TRICKS_COLLECTION).doc(id);
    await db.runTransaction(async (transaction) => {
      const trickDoc = await transaction.get(trickRef);
      if (!trickDoc.exists) return;
      
      const currentUsage = trickDoc.data()?.usageCount || 0;
      transaction.update(trickRef, { usageCount: currentUsage + 1 });
    });
  }

  async getProblemsForTrick(trickId: string): Promise<Problem[]> {
    const trickDoc = await db.collection(TRICKS_COLLECTION).doc(trickId).get();
    if (!trickDoc.exists) return [];
    
    const trick = { id: trickId, ...trickDoc.data() } as Trick;
    const problemReferences = trick.problems || [];
    
    // Get all problems referenced by this trick
    const problems: Problem[] = [];
    for (const reference of problemReferences) {
      const problemDoc = await db.collection(PROBLEMS_COLLECTION).doc(reference.leetcodeNumber.toString()).get();
      if (problemDoc.exists) {
        problems.push({ 
          leetcodeNumber: reference.leetcodeNumber, 
          ...problemDoc.data() 
        } as Problem);
      }
    }
    
    return problems;
  }

  async addProblemToTrick(trickId: string, problem: Problem): Promise<void> {
    const trickRef = db.collection(TRICKS_COLLECTION).doc(trickId);
    
    await db.runTransaction(async (transaction) => {
      const trickDoc = await transaction.get(trickRef);
      if (!trickDoc.exists) return;
      
      const trick = trickDoc.data() as Trick;
      const problems = trick.problems || [];
      
      // Check if the problem is already referenced
      const exists = problems.some(p => p.leetcodeNumber === problem.leetcodeNumber);
      if (exists) return;
      
      // Add the problem reference
      const problemReference: ProblemReference = {
        leetcodeNumber: problem.leetcodeNumber,
        title: problem.title
      };
      
      transaction.update(trickRef, { 
        problems: [...problems, problemReference] 
      });
    });
  }

  async removeProblemFromTrick(trickId: string, leetcodeNumber: number): Promise<void> {
    const trickRef = db.collection(TRICKS_COLLECTION).doc(trickId);
    
    await db.runTransaction(async (transaction) => {
      const trickDoc = await transaction.get(trickRef);
      if (!trickDoc.exists) return;
      
      const trick = trickDoc.data() as Trick;
      const problems = trick.problems || [];
      
      // Filter out the problem reference to remove
      const updatedProblems = problems.filter(p => p.leetcodeNumber !== leetcodeNumber);
      
      transaction.update(trickRef, { problems: updatedProblems });
      
      // If no more problems use this trick, decrease usage count
      if (updatedProblems.length < problems.length) {
        const currentUsage = trick.usageCount || 0;
        if (currentUsage > 0) {
          transaction.update(trickRef, { usageCount: currentUsage - 1 });
        }
      }
    });
  }
}

// Export a singleton instance for use throughout the application
export const storage = new FirebaseStorage();
