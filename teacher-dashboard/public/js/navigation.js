import { 
    menuItems, threadListView, leaderboardView, analyticsView, 
    contentView, settingsView, pageTitle, pageDescription,
    threadDetailView, backButton
} from './domElements.js';

// Navigation functionality
export function setupNavigation() {
    // Set up menu item click events
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.getAttribute('data-view');
            showView(viewName);
            
            // Update active menu item
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
    
    // Back button from thread detail
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (threadDetailView) threadDetailView.classList.add('hidden');
            if (threadListView) threadListView.classList.remove('hidden');
        });
    }
}

export function showView(viewName) {
    // Hide all views
    const views = [threadListView, threadDetailView, leaderboardView, analyticsView, contentView, settingsView];
    views.forEach(view => {
        if (view) view.classList.add('hidden');
    });
    
    // Show the selected view
    const selectedView = document.getElementById(viewName);
    if (selectedView) {
        selectedView.classList.remove('hidden');
        
        // Initialize specific view components when shown
        initializeViewComponents(viewName);
    }
    
    // Update page title and description
    updatePageHeader(viewName);
}

function initializeViewComponents(viewName) {
    switch(viewName) {
        case 'content-view':
            // Initialize quiz manager when content view is shown
            initializeQuizManager();
            break;
            
        case 'thread-list-view':
            // Initialize threads if needed
            if (window.threadManager) {
                window.threadManager.loadThreads();
            }
            break;
            
        case 'leaderboard-view':
            // Initialize leaderboard if needed
            if (window.leaderboardManager) {
                window.leaderboardManager.loadLeaderboard();
            }
            break;
    }
}

function initializeQuizManager() {
    // Ensure we're showing the quiz list, not the form
    const quizFormSection = document.getElementById('quiz-form-section');
    const quizListSection = document.getElementById('quiz-list-section');
    
    if (quizFormSection && quizListSection) {
        quizFormSection.classList.add('hidden');
        quizListSection.classList.remove('hidden');
    }
    
    // Load quizzes if quiz manager is available
    if (window.quizManager) {
        window.quizManager.loadQuizzes();
    } else {
        console.log('Quiz manager not available yet, waiting for initialization...');
        // The quiz manager will initialize automatically via quizManagement.js
    }
}

function updatePageHeader(viewName) {
    if (!pageTitle || !pageDescription) return;
    
    switch(viewName) {
        case 'thread-list-view':
            pageTitle.textContent = 'Community Forum';
            pageDescription.textContent = 'Connect with other educators and share insights';
            break;
        case 'leaderboard-view':
            pageTitle.textContent = 'Student Leaderboard';
            pageDescription.textContent = 'Track student progress and achievements';
            break;
        case 'analytics-view':
            pageTitle.textContent = 'Class Analytics';
            pageDescription.textContent = 'Track student progress and performance metrics';
            break;
        case 'content-view':
            pageTitle.textContent = 'Quiz Management';
            pageDescription.textContent = 'Create and manage math quizzes for your learners';
            break;
        case 'settings-view':
            pageTitle.textContent = 'Settings';
            pageDescription.textContent = 'Manage your account preferences';
            break;
    }
}

// Export function to manually show content view
export function showContentView() {
    showView('content-view');
    
    // Update active menu item
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === 'content-view') {
            item.classList.add('active');
        }
    });
}

// Make navigation available globally for button click handlers
window.showContentView = showContentView;