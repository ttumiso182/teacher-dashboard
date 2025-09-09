import { db, auth } from './firebaseInit.js';
import { currentThreadId } from './threads.js';
import { showError } from './utils.js';
import { loadComments } from './threads.js';

// Comment Form
export function setupCommentForm() {
    const commentForm = document.getElementById('comment-form');
    const commentText = document.getElementById('comment-text');
    
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentThreadId) return;
        
        const message = commentText.value.trim();
        if (!message) return;

        const submitButton = document.getElementById('submit-comment');
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';

        try {
            const user = auth.currentUser;
            const newComment = {
                message: message,
                userName: user.displayName || user.email,
                userId: user.uid,
                userGrade: 'Teacher',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                avatarIndex: 0,
                parentCommentId: null
            };

            const commentsRef = db.collection('community_posts').doc(currentThreadId).collection('comments');
            await commentsRef.add(newComment);

            commentText.value = '';
            loadComments(currentThreadId);
            
        } catch (error) {
            showError('Failed to post response: ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Post Response';
        }
    });
}