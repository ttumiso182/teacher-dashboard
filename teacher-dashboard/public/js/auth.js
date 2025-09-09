import { auth } from './firebaseInit.js';
import { 
  loginForm, emailInput, passwordInput, loginButton, loginError,
  logoutButton, welcomeMessage, loginView, dashboardView 
} from './domElements.js';
import { loadThreads } from './threads.js';

// Login Functionality
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    loginError.style.display = 'none';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Success handled by authStateChanged listener
    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = getFriendlyErrorMessage(error.code);
        loginError.style.display = 'block';
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }
});

// Logout Functionality
logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// Auth State Listener
auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user);
    if (user) {
        showDashboard(user);
    } else {
        showLogin();
    }
});

export function showDashboard(user) {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    welcomeMessage.textContent = `Welcome, ${user.email}!`;
    loadThreads();
}

export function showLogin() {
    dashboardView.style.display = 'none';
    loginView.style.display = 'flex';
    loginForm.reset();
    loginButton.disabled = false;
    loginButton.textContent = 'Sign In';
    loginError.style.display = 'none';
}

// Helper function to get user-friendly error messages
function getFriendlyErrorMessage(errorCode) {
    switch(errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'An error occurred during sign in. Please try again.';
    }
}