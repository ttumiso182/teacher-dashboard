import { auth, db } from './firebaseInit.js';
import { 
    loginForm, emailInput, passwordInput, loginButton, loginError,
    logoutButton, welcomeMessage, loginView, dashboardView 
} from './domElements.js';
import { loadThreads } from './threads.js';

console.log('auth.js loaded on', window.location.href);

// global flag used to avoid redirect races while an auth action is happening
if (typeof window._authActionInProgress === 'undefined') window._authActionInProgress = false;

// Presence tracking state
let presenceInterval = null;
let currentPresenceUid = null;

async function markUserOnline(user) {
    try {
        if (!db || !user) return;
        console.log('markUserOnline: updating presence for', user.uid, user.email);
        const teacherRef = db.collection('teachers').doc(user.uid);
        try {
            await teacherRef.set({
                status: 'online',
                lastActive: window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null
            }, { merge: true });
            console.log('markUserOnline: teacher doc updated for', user.uid);
        } catch (err) {
            console.error('markUserOnline: failed writing teacher doc', err);
        }

        currentPresenceUid = user.uid;

    // Add beforeunload handler to mark offline on close (best-effort)
        window.addEventListener('beforeunload', beforeUnloadHandler);

        // Start heartbeat to update teacher lastActive every minute
        if (presenceInterval) clearInterval(presenceInterval);
        presenceInterval = setInterval(async () => {
            try {
                const u = auth.currentUser;
                if (u) {
                    const ts = window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null;
                    // update teacher doc if exists
                    try {
                        const tSnap = await db.collection('teachers').where('uid', '==', u.uid).get();
                        if (!tSnap.empty) {
                            await tSnap.docs[0].ref.set({ lastActive: ts, status: 'online' }, { merge: true });
                            console.log('markUserOnline: teacher doc heartbeat updated for', u.uid);
                        }
                    } catch (e) {
                        console.warn('markUserOnline: teacher heartbeat update failed', e);
                    }
                }
            } catch (e) {
                console.warn('Presence heartbeat failed', e);
            }
        }, 60000); // 1 minute
    } catch (e) {
        console.warn('markUserOnline error', e);
    }
}

function beforeUnloadHandler() {
    try {
        const u = auth.currentUser;
        if (u && db) {
            // best-effort, do not await
            console.log('beforeUnloadHandler: marking offline for', u.uid);
            const ts = window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null;
            // update teacher doc if exists (best-effort)
            db.collection('teachers').where('uid', '==', u.uid).get()
                .then(snapshot => {
                    if (!snapshot.empty) {
                        snapshot.docs[0].ref.set({ status: 'offline', lastActive: ts }, { merge: true })
                            .then(() => console.log('beforeUnloadHandler: teacher doc set offline'))
                            .catch(err => console.warn('beforeUnloadHandler: teacher set failed', err));
                    }
                }).catch(() => {});
        }
    } catch (e) {
        // ignore
    }
}

async function markUserOffline(uid) {
    try {
        console.log('markUserOffline: marking offline for', uid);
        if (!db || !uid) return;
        const ts = window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null;
        // update teacher doc if exists
        try {
            const snap = await db.collection('teachers').where('uid', '==', uid).get();
            if (!snap.empty) {
                await snap.docs[0].ref.set({ status: 'offline', lastActive: ts }, { merge: true });
                console.log('markUserOffline: teacher doc updated for', uid);
            }
        } catch (e) {
            console.warn('markUserOffline: teacher doc update failed', e);
        }
    } catch (e) {
        console.warn('markUserOffline error', e);
    }
}

function stopPresence() {
    if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
    }
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    if (currentPresenceUid) {
        // best-effort
        console.log('stopPresence: calling markUserOffline for', currentPresenceUid);
        markUserOffline(currentPresenceUid);
        currentPresenceUid = null;
    }
}

// Login Functionality (only set up when login button exists on the page)
if (loginButton && loginForm) {
    loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = (emailInput.value || '').trim();
            const password = passwordInput.value;

            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';
            loginError.style.display = 'none';

        // mark auth action in progress to avoid redirect racing
        window._authActionInProgress = true;
        try {
            if (!db) throw new Error('Firestore not initialized');

            // Require a teachers document for this email before attempting auth
            const normalized = email.toLowerCase();
            let teachersSnap = await db.collection('teachers').where('emailLower', '==', normalized).get();
            if (teachersSnap.empty) {
                teachersSnap = await db.collection('teachers').where('email', '==', email).get();
            }

            if (teachersSnap.empty) {
                throw new Error('No account found in teachers registry. Please register or contact your administrator.');
            }

            const teacherDoc = teachersSnap.docs[0];

            // Now authenticate with Firebase Auth (this validates the password)
            const cred = await auth.signInWithEmailAndPassword(email, password);
            const authUser = cred.user;

            // If teacher doc already has uid, verify it matches the auth user
            const tdata = teacherDoc.data() || {};
            if (tdata.uid && tdata.uid !== authUser.uid) {
                // Mismatch: sign out and error
                await auth.signOut();
                throw new Error('Account mismatch detected. Please contact your administrator.');
            }

            // If teacher doc lacks uid, optionally set it (best-effort)
            if (!tdata.uid) {
                try {
                    await teacherDoc.ref.set({ uid: authUser.uid, email: authUser.email || null, emailLower: (authUser.email || '').toLowerCase().trim() }, { merge: true });
                    console.log('Linked teacher doc with auth uid for', authUser.uid);
                } catch (e) {
                    console.warn('Failed to link teacher doc uid', e);
                }
            }

            // Success: auth state listener will handle UI
        } catch (error) {
            console.error('Login error:', error);
            const msg = error.code ? getFriendlyErrorMessage(error.code) : (error.message || 'Sign in failed');
            loginError.textContent = msg;
            loginError.style.display = 'block';
            loginButton.disabled = false;
            loginButton.textContent = 'Sign In';
        } finally {
            window._authActionInProgress = false;
        }
    });
}

// Registration Functionality (set up when register button exists on the page)
const registerButton = document.getElementById('register-button');
if (registerButton) {
    const regForm = document.getElementById('login-form');
    const confirmInput = document.getElementById('confirm-password');
    const schoolInput = document.getElementById('school');
    const gradeInput = document.getElementById('grade');

    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.display = 'none';

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmValue = confirmInput ? confirmInput.value : '';

            if (password !== confirmValue) {
                loginError.textContent = 'Passwords do not match.';
                loginError.style.display = 'block';
                return;
            }

            registerButton.disabled = true;
            registerButton.textContent = 'Creating...';

            try {
                if (!db) throw new Error('Firestore not initialized');
                console.log('Checking teachers collection for', email);
                // Check teachers collection for matching email
                const snapshot = await db.collection('teachers')
                    .where('email', '==', email)
                    .get();

                console.log('Teachers query returned', snapshot.size, 'documents');

                if (snapshot.empty) {
                    throw new Error('Email not found in teachers registry. Please contact your admin.');
                }

                // Teacher exists — create the user with Firebase Auth
                window._authActionInProgress = true;
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Update teacher document with uid and metadata
                const teacherDocRef = snapshot.docs[0].ref;
                await teacherDocRef.update({
                    uid: user.uid,
                    registeredAt: window.firebase ? window.firebase.firestore.FieldValue.serverTimestamp() : null,
                    school: schoolInput ? schoolInput.value : null,
                    grade: gradeInput ? gradeInput.value : null
                });

                // Ensure we sign out newly created user so login flow is fresh
                try {
                    await auth.signOut();
                } catch (e) {
                    console.warn('Sign out after registration failed', e);
                }

                // On success redirect to login view
                window._authActionInProgress = false;
                window.location.href = 'index.html?show=login';
            } catch (err) {
                console.error('Registration error:', err);
                loginError.textContent = err.message || 'Registration failed. Please try again.';
                loginError.style.display = 'block';
                registerButton.disabled = false;
                registerButton.textContent = 'Create Account';
            }
        });
    }
}

// Logout Functionality (guard in case element not present on page)
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        // stop presence then sign out
        try {
            stopPresence();
        } catch (e) {
            console.warn('Error stopping presence on logout', e);
        }
        auth.signOut();
    });
}

// Auth State Listener
// Run redirect logic only after Firebase has initialized auth state
let initialAuthHandled = false;
auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user);
    if (user) {
        console.log('User is signed in:', user.email);
        // start presence tracking for this user
        try {
            markUserOnline(user).catch(err => console.warn('markUserOnline failed from onAuthStateChanged', err));
        } catch (e) {
            console.warn('Error invoking markUserOnline', e);
        }
        showDashboard(user);
    } else {
        console.log('No user signed in');
        showLogin();
        // stop presence if any
        try {
            stopPresence();
        } catch (e) {
            console.warn('Error stopping presence on auth state change', e);
        }

        // If this is the initial auth check, and page is index, redirect to register unless ?show=login
        if (!initialAuthHandled) {
            initialAuthHandled = true;
            try {
                const params = new URLSearchParams(window.location.search);
                if (params.get('show') !== 'login') {
                    const pathname = window.location.pathname;
                    const isIndex = pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/public');
                    const isRegister = pathname.endsWith('register.html');
                    console.log('Initial auth: isIndex=', isIndex, 'isRegister=', isRegister, 'search=', window.location.search);
                    if (isIndex && !isRegister) {
                        window.location.replace('register.html');
                    }
                }
            } catch (e) {
                console.warn('Redirect check failed', e);
            }
        }
    }
});

export function showDashboard(user) {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) {
        dashboardView.style.display = 'block';
    }
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${user.email}!`;
    try {
        loadThreads();
    } catch (e) {
        // loadThreads may not be available on this page — ignore
    }
}

export function showLogin() {
    if (dashboardView) dashboardView.style.display = 'none';
    if (loginView) loginView.style.display = 'flex';
    if (loginForm) loginForm.reset();
    if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }
    if (loginError) loginError.style.display = 'none';
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