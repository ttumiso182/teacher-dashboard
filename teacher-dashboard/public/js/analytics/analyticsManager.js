// Analytics Dashboard Manager - Compat version
import { AnalyticsDataService } from './analyticsDataService.js';
import { AnalyticsRenderer } from './analyticsRenderer.js';

class AnalyticsManager {
    constructor() {
        this.dataService = new AnalyticsDataService();
        this.renderer = new AnalyticsRenderer();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('Initializing Analytics Manager for Firestore (compat version)...');
            
            // Check if Firebase and Firestore are available (compat version)
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase is not loaded. Please check your Firebase imports.');
            }
            
            if (!firebase.firestore) {
                throw new Error('Firestore is not available. Please check Firebase configuration.');
            }
            
            // Check if user is authenticated
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated. Please log in again.');
            }
            
            console.log('User authenticated:', currentUser.email);
            console.log('Firestore available:', !!firebase.firestore);
            
            // Load all students data
            await this.dataService.loadAllStudentsData();
            
            // Initialize the dashboard with both students data and data service
            this.renderer.initialize(this.dataService.studentsData, this.dataService);
            
            this.isInitialized = true;
            console.log('Analytics Manager initialized successfully with Firestore');
        } catch (error) {
            console.error('Error initializing Analytics Manager:', error);
            
            // Show detailed error information
            let errorMessage = 'Failed to load analytics data. ';
            
            if (error.message.includes('permission-denied') || error.code === 'permission-denied') {
                errorMessage += 'Firestore permission denied. Please check security rules.';
            } else if (error.message.includes('not authenticated')) {
                errorMessage += 'Please log in again.';
            } else if (error.message.includes('Firestore is not available')) {
                errorMessage += 'Firestore not loaded. Please check Firebase imports.';
            } else if (error.message.includes('Firebase is not loaded')) {
                errorMessage += 'Firebase SDK not loaded. Please check your script tags.';
            } else {
                errorMessage += error.message;
            }
            
            this.renderer.showErrorState(errorMessage);
        }
    }

    refresh() {
        if (this.isInitialized) {
            this.renderer.updateDashboard(this.dataService.studentsData);
        }
    }

    showStudentDetails(userId) {
        if (this.isInitialized) {
            this.renderer.showStudentDetails(userId);
        }
    }

    getStudentPerformance(userId) {
        return this.dataService.studentsData.get(userId);
    }

    // Cleanup method when switching views
    cleanup() {
        this.renderer.hideStudentDetails();
    }
}

// Export singleton instance
export const analyticsManager = new AnalyticsManager();