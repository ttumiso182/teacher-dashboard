import { setupNavigation } from './navigation.js';
import { setupCommentForm } from './comments.js';
import { setupLeaderboard } from './leaderboard.js';
import { setupQuizManagement } from './quizManagement.js';

// Initialize the application
function initApp() {
    console.log("Initializing application...");
    try {
        setupNavigation();
        setupCommentForm();
        setupLeaderboard();
        setupQuizManagement();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Start the app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}