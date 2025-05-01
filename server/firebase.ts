import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if Firebase service account is available
console.log('Environment check - FIREBASE_SERVICE_ACCOUNT exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT);

// Use the project ID from environment variables or default
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'leetcodetracker-64097';
console.log('Using Firebase project ID:', projectId);

let serviceAccount = null;

try {
  // Initialize the Firebase Admin SDK
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account JSON from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Successfully parsed FIREBASE_SERVICE_ACCOUNT');
  } else {
    console.log('No FIREBASE_SERVICE_ACCOUNT found in environment variables');
  }
} catch (error) {
  console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', error);
  serviceAccount = null;
}

// Initialize the Firebase Admin SDK
let app;
try {
  if (serviceAccount) {
    // Initialize with explicit credentials
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId
    });
    console.log('Firebase Admin SDK initialized with service account credentials');
  } else {
    // Try to initialize with application default credentials
    console.warn('Attempting to initialize Firebase with application default credentials');
    app = admin.initializeApp({
      projectId: projectId
    });
  }
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error);
  throw error; // Rethrow to prevent the application from starting with invalid credentials
}

// Initialize Firestore and export
const db = getFirestore(app);
export { db };

// Export the app for potential future use
export default app;