import { auth, db } from './firebaseInit.js';
import { getQuizElements } from './domElements.js';

// Quiz Management System
class QuizManager {
    constructor() {
        this.quizzes = [];
        this.currentQuiz = null;
        this.currentUser = null;
        this.quizElements = null;
        this.collectionName = 'teacherQuizzes';
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.quizElements = getQuizElements();
        this.bindEvents();
        
        // Wait for auth state
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                console.log('QuizManager: User authenticated', user.uid);
                // Don't load quizzes immediately - wait for navigation
            } else {
                console.log('QuizManager: No user authenticated');
            }
        });
    }

    bindEvents() {
        const { quizForm, quizSearch, difficultyFilter } = this.quizElements;
        
        // Form submission
        if (quizForm) {
            quizForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveQuiz();
            });
        }

        // Search and filter
        if (quizSearch) {
            quizSearch.addEventListener('input', (e) => {
                this.filterQuizzes(e.target.value);
            });
        }

        if (difficultyFilter) {
            difficultyFilter.addEventListener('change', (e) => {
                this.filterQuizzes();
            });
        }

        // Add global event listeners for dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-quiz-btn')) {
                const quizId = e.target.dataset.quizId;
                if (quizId) this.editQuiz(quizId);
            }
            if (e.target.classList.contains('delete-quiz-btn')) {
                const quizId = e.target.dataset.quizId;
                if (quizId) this.confirmDelete(quizId);
            }
            if (e.target.classList.contains('add-question-btn')) {
                this.addQuestion();
            }
            if (e.target.classList.contains('remove-question-btn')) {
                e.target.closest('.question-card').remove();
                this.renumberQuestions();
            }
            if (e.target.classList.contains('clear-filters-btn')) {
                this.clearFilters();
            }
            if (e.target.classList.contains('load-without-index-btn')) {
                this.loadQuizzesWithoutIndex();
            }
            if (e.target.id === 'create-quiz-btn' || e.target.classList.contains('create-quiz-btn')) {
                this.showCreateForm();
            }
            if (e.target.id === 'cancel-quiz-btn' || e.target.id === 'cancel-form-btn') {
                this.hideCreateForm();
            }
            if (e.target.id === 'add-question-btn') {
                this.addQuestion();
            }
            if (e.target.id === 'delete-quiz-btn') {
                if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
                    this.deleteQuiz();
                }
            }
        });

        // Also add specific event listeners for better reliability
        this.addSpecificEventListeners();
    }

    addSpecificEventListeners() {
        // Add question button handler
        const addQuestionBtn = document.getElementById('add-question-btn');
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', () => this.addQuestion());
        }

        // Create quiz button handler
        const createQuizBtn = document.getElementById('create-quiz-btn');
        if (createQuizBtn) {
            createQuizBtn.addEventListener('click', () => this.showCreateForm());
        }

        // Cancel buttons handlers
        const cancelButtons = ['cancel-quiz-btn', 'cancel-form-btn'];
        cancelButtons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => this.hideCreateForm());
            }
        });

        // Delete quiz button handler
        const deleteQuizBtn = document.getElementById('delete-quiz-btn');
        if (deleteQuizBtn) {
            deleteQuizBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
                    this.deleteQuiz();
                }
            });
        }
    }

    // Load quizzes with proper error handling for indexes
    async loadQuizzes() {
        try {
            if (!this.currentUser) {
                this.showEmptyState('Please log in to view quizzes');
                return;
            }

            console.log('Loading quizzes for user:', this.currentUser.uid);

            // Try the optimized query first (with index)
            try {
                const quizzesRef = db.collection(this.collectionName);
                const snapshot = await quizzesRef
                    .where('createdBy', '==', this.currentUser.uid)
                    .orderBy('createdAt', 'desc')
                    .get();

                if (snapshot.empty) {
                    this.quizzes = [];
                    this.showEmptyState('No quizzes found. Create your first quiz!');
                    return;
                }

                this.quizzes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('Loaded quizzes with index:', this.quizzes.length);
                this.renderQuizzes();
                
            } catch (indexError) {
                console.log('Index query failed, falling back to manual filtering:', indexError);
                this.loadQuizzesWithoutIndex();
            }
            
        } catch (error) {
            console.error('Error loading quizzes:', error);
            this.showNotification('Error loading quizzes: ' + error.message, 'error');
            this.showEmptyState('Error loading quizzes');
        }
    }

    // Fallback method without index requirements
    async loadQuizzesWithoutIndex() {
        try {
            const quizzesRef = db.collection(this.collectionName);
            const snapshot = await quizzesRef.get();

            if (snapshot.empty) {
                this.quizzes = [];
                this.showEmptyState('No quizzes found. Create your first quiz!');
                return;
            }

            // Filter by user and sort manually
            this.quizzes = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(quiz => quiz.createdBy === this.currentUser.uid)
                .sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA; // Descending order
                });

            console.log('Loaded quizzes without index:', this.quizzes.length);
            this.renderQuizzes();
            this.showIndexHelpMessage();
            
        } catch (error) {
            console.error('Error loading quizzes without index:', error);
            this.showNotification('Error loading quizzes: ' + error.message, 'error');
            this.showEmptyState('Error loading quizzes');
        }
    }

    // Show help message for index setup
    showIndexHelpMessage() {
        this.showNotification(
            'Quizzes loaded (manual mode). For better performance, set up a Firestore index.', 
            'warning'
        );
    }

    // Show empty state
    showEmptyState(message = 'No quizzes found') {
        const { quizzesTableContainer } = this.quizElements;
        if (!quizzesTableContainer) return;

        quizzesTableContainer.innerHTML = `
            <div class="empty-state">
                <h3>${message}</h3>
                ${message.includes('No quizzes') ? `
                    <p>Get started by creating your first math quiz!</p>
                    <button class="btn btn-primary mt-2" onclick="window.quizManager.showCreateForm()">
                        + Create Your First Quiz
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Render quizzes table
    renderQuizzes() {
        const { quizzesTableContainer, quizSearch, difficultyFilter } = this.quizElements;
        
        if (!quizzesTableContainer) return;

        const searchTerm = (quizSearch?.value || '').toLowerCase();
        const difficulty = difficultyFilter?.value || '';

        const filteredQuizzes = this.quizzes.filter(quiz => {
            const matchesSearch = quiz.title.toLowerCase().includes(searchTerm) ||
                                (quiz.description && quiz.description.toLowerCase().includes(searchTerm));
            const matchesDifficulty = !difficulty || 
                                    quiz.questions.some(q => q.difficulty === difficulty);
            return matchesSearch && matchesDifficulty;
        });

        if (filteredQuizzes.length === 0) {
            quizzesTableContainer.innerHTML = `
                <div class="empty-state">
                    <p>No quizzes match your search criteria.</p>
                    <button class="btn btn-outline mt-1 clear-filters-btn">
                        Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        quizzesTableContainer.innerHTML = `
            <table class="quizzes-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Grade/Term/Level</th>
                        <th>Questions</th>
                        <th>Difficulty</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredQuizzes.map(quiz => this.renderQuizRow(quiz)).join('')}
                </tbody>
            </table>
        `;
    }

    renderQuizRow(quiz) {
        const difficulties = [...new Set(quiz.questions.map(q => q.difficulty))];
        const createdDate = quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : 'Unknown';
        
        return `
            <tr>
                <td>
                    <strong>${this.escapeHtml(quiz.title)}</strong>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 0.25rem;">
                        Created: ${createdDate}
                    </div>
                </td>
                <td>${this.escapeHtml(quiz.description || 'No description')}</td>
                <td>G${quiz.grade}/T${quiz.term}/L${quiz.level}</td>
                <td>${quiz.questions.length}</td>
                <td>
                    ${difficulties.map(diff => 
                        `<span class="difficulty-badge difficulty-${diff.toLowerCase()}">${diff}</span>`
                    ).join('')}
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary edit-quiz-btn" data-quiz-id="${quiz.id}">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-quiz-btn" data-quiz-id="${quiz.id}">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }

    // Clear search and filter inputs
    clearFilters() {
        const { quizSearch, difficultyFilter } = this.quizElements;
        if (quizSearch) quizSearch.value = '';
        if (difficultyFilter) difficultyFilter.value = '';
        this.renderQuizzes();
    }

    // Show create form
    showCreateForm() {
        this.currentQuiz = null;
        this.showFormSection();
        
        const { formTitle, deleteQuizBtn } = this.quizElements;
        if (formTitle) formTitle.textContent = 'Create New Quiz';
        if (deleteQuizBtn) deleteQuizBtn.classList.add('hidden');
        
        this.resetForm();
    }

    // Show edit form
    async editQuiz(quizId) {
        try {
            const quizDoc = await db.collection(this.collectionName).doc(quizId).get();
            if (!quizDoc.exists) {
                this.showNotification('Quiz not found', 'error');
                return;
            }

            this.currentQuiz = {
                id: quizDoc.id,
                ...quizDoc.data()
            };

            this.showFormSection();
            
            const { formTitle, deleteQuizBtn } = this.quizElements;
            if (formTitle) formTitle.textContent = 'Edit Quiz';
            if (deleteQuizBtn) deleteQuizBtn.classList.remove('hidden');
            
            this.populateForm(this.currentQuiz);
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showNotification('Error loading quiz: ' + error.message, 'error');
        }
    }

    showFormSection() {
        const { quizFormSection, quizListSection } = this.quizElements;
        if (quizFormSection) quizFormSection.classList.remove('hidden');
        if (quizListSection) quizListSection.classList.add('hidden');
    }

    hideCreateForm() {
        const { quizFormSection, quizListSection } = this.quizElements;
        if (quizFormSection) quizFormSection.classList.add('hidden');
        if (quizListSection) quizListSection.classList.remove('hidden');
        this.currentQuiz = null;
        this.loadQuizzes(); // Reload to show any new quizzes
    }

    // Reset form
    resetForm() {
        const { quizForm, questionsList, quizId } = this.quizElements;
        
        if (quizForm) quizForm.reset();
        if (questionsList) questionsList.innerHTML = '';
        if (quizId) quizId.value = '';
        
        // Add one empty question by default
        this.addQuestion();
    }

    // Populate form with quiz data
    populateForm(quiz) {
        const { quizId, quizTitle, quizDescription, quizGrade, quizTerm, quizLevel, questionsList } = this.quizElements;
        
        if (quizId) quizId.value = quiz.id;
        if (quizTitle) quizTitle.value = quiz.title;
        if (quizDescription) quizDescription.value = quiz.description || '';
        if (quizGrade) quizGrade.value = quiz.grade;
        if (quizTerm) quizTerm.value = quiz.term;
        if (quizLevel) quizLevel.value = quiz.level;

        // Clear existing questions
        if (questionsList) questionsList.innerHTML = '';
        
        // Add questions
        quiz.questions.forEach(question => {
            this.addQuestion(question);
        });
    }

    // Add question to form
    addQuestion(questionData = null) {
        const { questionsList } = this.quizElements;
        if (!questionsList) return;
        
        const questionIndex = questionsList.children.length;
        
        const questionHtml = `
            <div class="question-card" data-index="${questionIndex}">
                <div class="question-header">
                    <h5>Question ${questionIndex + 1}</h5>
                    <button type="button" class="btn btn-sm btn-danger remove-question-btn">
                        Remove
                    </button>
                </div>
                
                <div class="form-group">
                    <label>Question Text *</label>
                    <textarea class="form-control question-text" required placeholder="Enter the question text">${questionData?.question || ''}</textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Difficulty *</label>
                        <select class="form-control question-difficulty" required>
                            <option value="Easy" ${questionData?.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
                            <option value="Moderate" ${questionData?.difficulty === 'Moderate' ? 'selected' : ''}>Moderate</option>
                            <option value="Hard" ${questionData?.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Correct Answer Index *</label>
                        <select class="form-control correct-answer" required>
                            <option value="0" ${questionData?.correctAnswerIndex === 0 ? 'selected' : ''}>Option 1</option>
                            <option value="1" ${questionData?.correctAnswerIndex === 1 ? 'selected' : ''}>Option 2</option>
                            <option value="2" ${questionData?.correctAnswerIndex === 2 ? 'selected' : ''}>Option 3</option>
                            <option value="3" ${questionData?.correctAnswerIndex === 3 ? 'selected' : ''}>Option 4</option>
                        </select>
                    </div>
                </div>

                <div class="options-container">
                    <label>Options * (All options must be unique)</label>
                    ${[0, 1, 2, 3].map(i => `
                        <div class="option-input">
                            <label>Option ${i + 1}:</label>
                            <input type="text" class="form-control option-input" 
                                   value="${this.escapeHtml(questionData?.options?.[i] || '')}" 
                                   placeholder="Enter option ${i + 1}" required>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        questionsList.insertAdjacentHTML('beforeend', questionHtml);
    }

    // Renumber questions when one is removed
    renumberQuestions() {
        const questions = document.querySelectorAll('.question-card');
        questions.forEach((card, index) => {
            card.setAttribute('data-index', index);
            const header = card.querySelector('h5');
            if (header) header.textContent = `Question ${index + 1}`;
        });
    }

    // Save quiz (create or update)
    async saveQuiz() {
        try {
            if (!this.currentUser) {
                this.showNotification('Please log in to save quizzes', 'error');
                return;
            }

            const formData = this.getFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            const { saveQuizBtn } = this.quizElements;
            if (saveQuizBtn) {
                saveQuizBtn.disabled = true;
                saveQuizBtn.textContent = 'Saving...';
            }

            const quizData = {
                ...formData,
                createdBy: this.currentUser.uid,
                updatedAt: new Date().toISOString()
            };

            if (this.currentQuiz) {
                // Update existing quiz
                await db.collection(this.collectionName).doc(this.currentQuiz.id).update(quizData);
                this.showNotification('Quiz updated successfully!', 'success');
            } else {
                // Create new quiz
                quizData.createdAt = new Date().toISOString();
                await db.collection(this.collectionName).add(quizData);
                this.showNotification('Quiz created successfully!', 'success');
            }

            this.hideCreateForm();
            
        } catch (error) {
            console.error('Error saving quiz:', error);
            
            if (error.code === 'permission-denied') {
                this.showNotification('Permission denied. Please check your Firebase security rules.', 'error');
            } else {
                this.showNotification('Error saving quiz: ' + error.message, 'error');
            }
        } finally {
            const { saveQuizBtn } = this.quizElements;
            if (saveQuizBtn) {
                saveQuizBtn.disabled = false;
                saveQuizBtn.textContent = 'Save Quiz';
            }
        }
    }

    // Get form data
    getFormData() {
        const { quizTitle, quizDescription, quizGrade, quizTerm, quizLevel } = this.quizElements;
        
        const questions = [];
        const questionCards = document.querySelectorAll('.question-card');
        
        questionCards.forEach((card, index) => {
            const questionText = card.querySelector('.question-text')?.value || '';
            const difficulty = card.querySelector('.question-difficulty')?.value || 'Easy';
            const correctAnswerIndex = parseInt(card.querySelector('.correct-answer')?.value || '0');
            const optionInputs = card.querySelectorAll('.option-input input');
            const options = Array.from(optionInputs).map(input => input.value);
            
            questions.push({
                id: index + 1,
                question: questionText,
                options: options,
                correctAnswerIndex: correctAnswerIndex,
                difficulty: difficulty
            });
        });

        return {
            title: quizTitle?.value || '',
            description: quizDescription?.value || '',
            grade: parseInt(quizGrade?.value || '4'),
            term: parseInt(quizTerm?.value || '1'),
            level: parseInt(quizLevel?.value || '1'),
            questions: questions
        };
    }

    // Validate form
    validateForm(data) {
        if (!data.title.trim()) {
            this.showNotification('Quiz title is required', 'error');
            return false;
        }

        if (data.questions.length === 0) {
            this.showNotification('At least one question is required', 'error');
            return false;
        }

        for (let i = 0; i < data.questions.length; i++) {
            const question = data.questions[i];
            if (!question.question.trim()) {
                this.showNotification(`Question ${i + 1}: Text is required`, 'error');
                return false;
            }

            if (question.options.some(opt => !opt.trim())) {
                this.showNotification(`Question ${i + 1}: All options are required`, 'error');
                return false;
            }

            if (new Set(question.options).size !== question.options.length) {
                this.showNotification(`Question ${i + 1}: Options must be unique`, 'error');
                return false;
            }
        }

        return true;
    }

    // Delete quiz
    async deleteQuiz() {
        if (!this.currentQuiz || !this.currentUser) return;

        try {
            await db.collection(this.collectionName).doc(this.currentQuiz.id).delete();
            this.showNotification('Quiz deleted successfully!', 'success');
            this.hideCreateForm();
        } catch (error) {
            console.error('Error deleting quiz:', error);
            this.showNotification('Error deleting quiz: ' + error.message, 'error');
        }
    }

    // Confirm deletion
    confirmDelete(quizId) {
        if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
            this.editQuiz(quizId);
        }
    }

    // Filter quizzes
    filterQuizzes(searchTerm = '') {
        this.renderQuizzes();
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Escape HTML to prevent XSS
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize quiz manager
let quizManager = null;

export function initQuizManager() {
    if (!quizManager) {
        quizManager = new QuizManager();
        window.quizManager = quizManager;
    }
    return quizManager;
}

export function setupQuizManagement() {
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initQuizManager();
        });
    } else {
        initQuizManager();
    }
}