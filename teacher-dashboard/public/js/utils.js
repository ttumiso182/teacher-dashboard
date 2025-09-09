import { db } from './firebaseInit.js';

// Utility Functions
export function formatTime(timestamp) {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

export function showLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const noThreads = document.getElementById('no-threads');
    
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    noThreads.classList.add('hidden');
}

export function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('hidden');
}

export function showError(message) {
    const errorMessage = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    loadingIndicator.classList.add('hidden');
}

export function updateUserPoints(user) {
    // This function would be called when a user helps others
    // For now, we'll just ensure the user exists in the points collection
    
    const userRef = db.collection('teacher_points').doc(user.uid);
    
    userRef.get().then((doc) => {
        if (!doc.exists) {
            // Create new user in points collection
            userRef.set({
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                points: 0,
                lastUpdated: new Date()
            });
        }
    }).catch((error) => {
        console.error("Error updating user points: ", error);
    });
}