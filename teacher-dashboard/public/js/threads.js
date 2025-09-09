import { db } from './firebaseInit.js';
import { 
    threadList, threadListView, threadDetailView, 
    loadingIndicator, errorMessage, noThreads 
} from './domElements.js';
import { formatTime, showLoading, hideLoading, showError } from './utils.js';
import { showView } from './navigation.js';

// State
export let currentThreadId = null;

// Data Loading
export function loadThreads() {
    showLoading();
    
    const threadsQuery = db.collection('community_posts')
        .where('question', '==', true)
        .orderBy('timestamp', 'desc');

    threadsQuery.get()
        .then((querySnapshot) => {
            hideLoading();
            
            if (querySnapshot.empty) {
                noThreads.classList.remove('hidden');
                return;
            }

            noThreads.classList.add('hidden');
            threadList.innerHTML = '';

            querySnapshot.forEach((doc) => {
                const thread = doc.data();
                const threadElement = createThreadElement(thread, doc.id);
                threadList.appendChild(threadElement);
            });
        })
        .catch((error) => {
            hideLoading();
            showError('Failed to load discussions: ' + error.message);
        });
}

function createThreadElement(thread, threadId) {
    const div = document.createElement('div');
    div.className = 'thread-item';
    div.innerHTML = `
        <div class="thread-header">
            <span class="thread-author">${thread.userName || 'Anonymous'}</span>
            <span class="thread-grade">${thread.userGrade || 'Grade 4'}</span>
        </div>
        <p class="thread-preview">${thread.message}</p>
        <div class="thread-meta">
            <span class="thread-time">${formatTime(thread.timestamp)}</span>
        </div>
    `;

    div.addEventListener('click', () => {
        loadThreadDetail(threadId, thread);
    });

    return div;
}

export function loadThreadDetail(threadId, threadData) {
    currentThreadId = threadId;
    showView('thread-detail-view');

    // Display original post
    const originalPost = document.getElementById('original-post');
    originalPost.innerHTML = `
        <div class="original-post-header">
            <span class="thread-author">${threadData.userName || 'Anonymous'}</span>
            <span class="thread-grade">${threadData.userGrade || 'Grade 4'}</span>
        </div>
        <p>${threadData.message}</p>
        <div class="thread-meta">
            <span class="thread-time">${formatTime(threadData.timestamp)}</span>
        </div>
    `;

    // Load comments
    loadComments(threadId);
}

export function loadComments(threadId) {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = '<div style="text-align: center; padding: 1rem;">Loading responses...</div>';

    const commentsRef = db.collection('community_posts').doc(threadId).collection('comments');
    
    commentsRef.orderBy('timestamp', 'asc').get()
        .then((querySnapshot) => {
            commentsList.innerHTML = '';

            if (querySnapshot.empty) {
                commentsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;">No responses yet. Be the first to contribute!</div>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const comment = doc.data();
                const commentElement = createCommentElement(comment);
                commentsList.appendChild(commentElement);
            });
        })
        .catch((error) => {
            commentsList.innerHTML = `<div style="color: #dc3545; text-align: center; padding: 1rem;">Error loading responses: ${error.message}</div>`;
        });
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${comment.userName || 'Anonymous'}</span>
            <span class="comment-time">${formatTime(comment.timestamp)}</span>
        </div>
        <p class="comment-message">${comment.message}</p>
    `;
    return div;
}