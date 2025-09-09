import { setupNavigation } from './navigation.js';
import { setupCommentForm } from './comments.js';
import { setupLeaderboard } from './leaderboard.js';

// Initialize the application
function initApp() {
    console.log("Initializing application...");
    setupNavigation();
    setupCommentForm();
    setupLeaderboard();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);