// DOM Elements
export const loginView = document.getElementById('login-view');
export const dashboardView = document.getElementById('dashboard-view');
export const loginForm = document.getElementById('login-form');
export const emailInput = document.getElementById('email');
export const passwordInput = document.getElementById('password');
export const loginButton = document.getElementById('login-button');
export const loginError = document.getElementById('login-error');
export const logoutButton = document.getElementById('logout-button');
export const welcomeMessage = document.getElementById('welcome-message');
export const threadListView = document.getElementById('thread-list-view');
export const threadDetailView = document.getElementById('thread-detail-view');
export const threadList = document.getElementById('thread-list');
export const backButton = document.getElementById('back-button');
export const commentForm = document.getElementById('comment-form');
export const commentText = document.getElementById('comment-text');
export const loadingIndicator = document.getElementById('loading-indicator');
export const errorMessage = document.getElementById('error-message');
export const noThreads = document.getElementById('no-threads');

// Leaderboard DOM Elements
export const leaderboardView = document.getElementById('leaderboard-view');
export const leaderboardList = document.getElementById('leaderboard-list');
export const leaderboardLoading = document.getElementById('leaderboard-loading');
export const leaderboardError = document.getElementById('leaderboard-error');
export const timeFilter = document.getElementById('time-filter');
export const gradeFilter = document.getElementById('grade-filter');

// Other Views
export const analyticsView = document.getElementById('analytics-view');
export const contentView = document.getElementById('content-view');
export const settingsView = document.getElementById('settings-view');

// Navigation Elements
export const menuItems = document.querySelectorAll('.menu-item');
export const pageTitle = document.getElementById('page-title');
export const pageDescription = document.getElementById('page-description');

// Quiz Management DOM Elements - with safe getElementById
export const getQuizElements = () => ({
    quizListSection: document.getElementById('quiz-list-section'),
    quizFormSection: document.getElementById('quiz-form-section'),
    quizzesTableContainer: document.getElementById('quizzes-table-container'),
    quizSearch: document.getElementById('quiz-search'),
    difficultyFilter: document.getElementById('difficulty-filter'),
    quizForm: document.getElementById('quiz-form'),
    quizId: document.getElementById('quiz-id'),
    quizTitle: document.getElementById('quiz-title'),
    quizDescription: document.getElementById('quiz-description'),
    quizGrade: document.getElementById('quiz-grade'),
    quizTerm: document.getElementById('quiz-term'),
    quizLevel: document.getElementById('quiz-level'),
    questionsList: document.getElementById('questions-list'),
    saveQuizBtn: document.getElementById('save-quiz-btn'),
    deleteQuizBtn: document.getElementById('delete-quiz-btn'),
    formTitle: document.getElementById('form-title')
});