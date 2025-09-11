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
    
    // Modified query to get all posts (both questions and screenshots)
    const threadsQuery = db.collection('community_posts')
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

            let hasVisiblePosts = false;
            
            querySnapshot.forEach((doc) => {
                const thread = doc.data();
                // Only show posts that are either questions or have screenshots
                if (thread.question === true || thread.imageBase64) {
                    hasVisiblePosts = true;
                    const threadElement = createThreadElement(thread, doc.id);
                    threadList.appendChild(threadElement);
                }
            });
            
            // If no posts match our criteria, show the no threads message
            if (!hasVisiblePosts) {
                noThreads.classList.remove('hidden');
                noThreads.textContent = "No discussions or screenshots yet. Be the first to share!";
            }
        })
        .catch((error) => {
            hideLoading();
            showError('Failed to load discussions: ' + error.message);
        });
}

function createThreadElement(thread, threadId) {
    const div = document.createElement('div');
    div.className = 'thread-item';
    
    // Add different styling for screenshot posts
    if (thread.imageBase64) {
        div.classList.add('screenshot-post');
    }
    
    let contentHTML = `
        <div class="thread-header">
            <span class="thread-author">${thread.userName || 'Anonymous'}</span>
            <span class="thread-grade">${thread.userGrade || 'Grade 4'}</span>
        </div>
    `;
    
    // Add screenshot thumbnail if available
    if (thread.imageBase64) {
        // Format the base64 string for proper display
        const imageSrc = formatBase64Image(thread.imageBase64);
        contentHTML += `
            <div class="screenshot-thumbnail">
                <img src="${imageSrc}" alt="Screenshot" onclick="event.stopPropagation(); openScreenshotModal('${imageSrc}')">
                <span class="screenshot-label">📷 Screenshot</span>
            </div>
        `;
    }
    
    // Add message text if available
    if (thread.message) {
        contentHTML += `<p class="thread-preview">${thread.message}</p>`;
    }
    
    contentHTML += `
        <div class="thread-meta">
            <span class="thread-time">${formatTime(thread.timestamp)}</span>
            ${thread.imageBase64 ? '<span class="post-type">Screenshot</span>' : '<span class="post-type">Discussion</span>'}
        </div>
    `;
    
    div.innerHTML = contentHTML;

    div.addEventListener('click', () => {
        loadThreadDetail(threadId, thread);
    });

    return div;
}

// Helper function to format base64 image data
function formatBase64Image(base64String) {
    // Check if the string already has a data URL prefix
    if (base64String.startsWith('data:image/')) {
        return base64String;
    }
    
    // If it doesn't have a prefix, assume it's a PNG and add the prefix
    return `data:image/png;base64,${base64String}`;
}

// Add this function to handle screenshot modal
function openScreenshotModal(imageUrl) {
    // Create modal elements if they don't exist
    let modal = document.getElementById('screenshot-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'screenshot-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <img src="" alt="Full size screenshot" id="modal-image">
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add click handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }
    
    // Show the image in modal
    document.getElementById('modal-image').src = imageUrl;
    modal.classList.remove('hidden');
}

// Make the function available globally for the onclick handler
window.openScreenshotModal = openScreenshotModal;

export function loadThreadDetail(threadId, threadData) {
    currentThreadId = threadId;
    showView('thread-detail-view');

    let contentHTML = `
        <div class="original-post-header">
            <span class="thread-author">${threadData.userName || 'Anonymous'}</span>
            <span class="thread-grade">${threadData.userGrade || 'Grade 4'}</span>
        </div>
    `;
    
    // Add screenshot if available
    if (threadData.imageBase64) {
        // Format the base64 string for proper display
        const imageSrc = formatBase64Image(threadData.imageBase64);
        contentHTML += `
            <div class="thread-screenshot">
                <img src="${imageSrc}" alt="Screenshot">
                <span class="screenshot-label">📷 Screenshot</span>
            </div>
        `;
    }
    
    // Add message text if available
    if (threadData.message) {
        contentHTML += `<p>${threadData.message}</p>`;
    }
    
    contentHTML += `
        <div class="thread-meta">
            <span class="thread-time">${formatTime(threadData.timestamp)}</span>
            ${threadData.imageBase64 ? '<span class="post-type">Screenshot Post</span>' : '<span class="post-type">Discussion</span>'}
        </div>
    `;

    // Display original post
    const originalPost = document.getElementById('original-post');
    originalPost.innerHTML = contentHTML;

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