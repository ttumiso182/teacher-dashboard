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
    backButton.addEventListener('click', () => {
        threadDetailView.classList.add('hidden');
        threadListView.classList.remove('hidden');
    });
}

export function showView(viewName) {
    // Hide all views
    const views = [threadListView, threadDetailView, leaderboardView, analyticsView, contentView, settingsView];
    views.forEach(view => view.classList.add('hidden'));
    
    // Show the selected view
    const selectedView = document.getElementById(viewName);
    if (selectedView) {
        selectedView.classList.remove('hidden');
    }
    
    // Update page title and description
    updatePageHeader(viewName);
}

function updatePageHeader(viewName) {
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
            pageTitle.textContent = 'Content Management';
            pageDescription.textContent = 'Create and manage learning materials';
            break;
        case 'settings-view':
            pageTitle.textContent = 'Settings';
            pageDescription.textContent = 'Manage your account preferences';
            break;
    }
}