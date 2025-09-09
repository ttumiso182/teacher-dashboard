import { 
    sidebarMenuItems, contentViews, pageTitle, pageDescription,
    threadListView, leaderboardView, studentProgressView, 
    analyticsView, resourcesView, sidebar, toggleSidebarButton,
    mobileMenuToggle
} from './domElements.js';

// Sidebar navigation functionality
export function setupSidebar() {
    // Set up sidebar toggle
    setupSidebarToggle();
    
    // Set up mobile menu
    setupMobileMenu();
    
    // Add click event listeners to menu items
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.getAttribute('data-view');
            navigateToView(viewName, item);
        });
    });
}

function setupSidebarToggle() {
    toggleSidebarButton.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        
        // Change icon based on state
        const icon = toggleSidebarButton.querySelector('i');
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        } else {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        }
    });
}

function setupMobileMenu() {
    // Mobile menu toggle
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('active') &&
            !sidebar.contains(event.target) &&
            event.target !== mobileMenuToggle &&
            !mobileMenuToggle.contains(event.target)) {
            sidebar.classList.remove('active');
        }
    });
}

export function navigateToView(viewName, menuItem) {
    // Hide all content views
    contentViews.forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show the selected view
    const targetView = document.getElementById(viewName);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    // Update active menu item
    sidebarMenuItems.forEach(item => {
        item.classList.remove('active');
    });
    menuItem.classList.add('active');
    
    // Update page title and description
    updatePageHeader(viewName);
    
    // On mobile, close sidebar after selection
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

function updatePageHeader(viewName) {
    switch(viewName) {
        case 'thread-list-view':
            pageTitle.textContent = 'Community Forum';
            pageDescription.textContent = 'Connect with other educators and share insights';
            break;
        case 'thread-detail-view':
            pageTitle.textContent = 'Discussion Thread';
            pageDescription.textContent = 'View and participate in the discussion';
            break;
        case 'leaderboard-view':
            pageTitle.textContent = 'Teacher Leaderboard';
            pageDescription.textContent = 'Ranked by student progress and engagement';
            break;
        case 'student-progress-view':
            pageTitle.textContent = 'Student Progress';
            pageDescription.textContent = 'Monitor your students\' performance and progress';
            break;
        case 'analytics-view':
            pageTitle.textContent = 'Analytics';
            pageDescription.textContent = 'Detailed analytics and insights';
            break;
        case 'resources-view':
            pageTitle.textContent = 'Resources';
            pageDescription.textContent = 'Teaching resources and materials';
            break;
        default:
            pageTitle.textContent = 'Math Gamified';
            pageDescription.textContent = 'Teacher Dashboard';
    }
}

// Function to navigate back to thread list from detail view
export function navigateToThreadList() {
    const threadListItem = document.querySelector('[data-view="thread-list-view"]');
    navigateToView('thread-list-view', threadListItem);
}