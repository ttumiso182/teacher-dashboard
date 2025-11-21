// analyticsManager.js - FINAL PRODUCTION VERSION
import { AnalyticsDataService } from './analyticsDataService.js';
import { AnalyticsRenderer } from './analyticsRenderer.js';

class AnalyticsManager {
    constructor() {
        this.dataService = new AnalyticsDataService();
        this.renderer = new AnalyticsRenderer();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        try {
            if (!firebase?.auth()?.currentUser) throw new Error('Not authenticated');
            if (!firebase?.firestore) throw new Error('Firestore not loaded');

            await this.dataService.loadAllStudentsData();
            this.renderer.initialize(this.dataService.studentsData);
            this.initialized = true;
        } catch (err) {
            this.renderer.showErrorState(err.message || 'Unknown error');
        }
    }
}

export const analyticsManager = new AnalyticsManager();