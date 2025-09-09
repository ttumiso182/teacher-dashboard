import { firebaseConfig } from './config.js';

// Initialize Firebase
try {
    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error("Firebase initialization error", error);
}

// Export Firebase services
export const db = firebase.firestore();
export const auth = firebase.auth();

// Set persistence to session
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
    .catch((error) => {
        console.error("Auth persistence error", error);
    });