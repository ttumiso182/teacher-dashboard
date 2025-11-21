// analyticsDataService.js - FINAL WITH REAL NAMES & FULL PROFILE
export class AnalyticsDataService {
    constructor() {
        this.studentsData = new Map();
    }

    async loadAllStudentsData() {
        try {
            if (!firebase?.firestore) throw new Error('Firebase not initialized');

            const usersSnapshot = await firebase.firestore().collection('users').get();
            const students = [];

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Read gameMetrics sub-collection
                const metricsSnap = await userDoc.ref.collection('gameMetrics').get();
                if (metricsSnap.empty) continue; // skip if no game data

                const gameMetrics = {};
                metricsSnap.forEach(doc => gameMetrics[doc.id] = doc.data());

                const fullData = { ...userData, gameMetrics };
                students.push(this.analyzeStudentPerformance(userId, fullData, userData));
            }

            this.studentsData = new Map(students.map(s => [s.userId, s]));
            console.log(`Loaded ${this.studentsData.size} students`);
            return this.studentsData;

        } catch (error) {
            console.error('Load failed:', error);
            throw error;
        }
    }

    analyzeStudentPerformance(userId, gameData, profileData) {
        // === REAL NAME LOGIC (exactly what you want) ===
        const firstName = (profileData.name || '').trim();
        const lastName = (profileData.surname || '').trim();
        const nickname = (profileData.nickname || '').trim();

        const displayName = firstName && lastName 
            ? `${firstName} ${lastName}`
            : nickname 
                ? nickname 
                : firstName || lastName || 'Student';

        const perf = {
            userId,
            displayName,
            grade: profileData.grade || '—',
            school: profileData.school || '—',
            coins: profileData.totalCoins || 0,
            avatarIndex: profileData.avatarIndex ?? 0,
            lastActivity: this.getLastActivity(gameData),
            difficultyPerformance: {
                easy:   this.calcDiff(gameData, 'easy'),
                medium: this.calcDiff(gameData, 'medium'),
                hard:   this.calcDiff(gameData, 'hard')
            }
        };

        perf.riskLevel = this.calculateRiskLevel(perf);
        perf.weaknesses = this.identifyWeaknesses(perf);

        return perf;
    }

    // Rest of the methods stay exactly the same (calcDiff, risk, etc.)
    calcDiff(userData, target) {
        let attempts = 0, correct = 0, firstTry = 0;
        const lower = target.toLowerCase();

        Object.values(userData.gameMetrics || {}).forEach(level => {
            const p = level?.performance;
            if (!p) return;

            const get = map => {
                if (!map) return 0;
                for (const key in map) {
                    if (key.toLowerCase().startsWith(lower)) {
                        return Number(map[key]) || 0;
                    }
                }
                return 0;
            };

            attempts += get(p.attemptsPerDifficulty);
            correct  += get(p.correctMatchesPerDifficulty);
            firstTry += get(p.firstTryCorrect || p.firstTryAttempts);
        });

        const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
        const firstAccuracy = attempts ? Math.round((firstTry / attempts) * 100) : 0;

        return { attempts, correct, accuracy, firstAccuracy };
    }

    calculateRiskLevel(p) {
        const { easy, medium, hard } = p.difficultyPerformance;
        let score = 0;
        if (hard.accuracy < 50) score += 3;
        else if (hard.accuracy < 65) score += 2;
        else if (hard.accuracy < 75) score += 1;
        if (medium.accuracy < 60) score += 2;
        else if (medium.accuracy < 75) score += 1;
        if (easy.accuracy < 80) score += 1;
        return score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
    }

    identifyWeaknesses(p) {
        const w = [];
        const { easy, medium, hard } = p.difficultyPerformance;
        if (hard.accuracy < 60) w.push('Hard difficulty challenges');
        if (medium.accuracy < 70) w.push('Medium difficulty concepts');
        if (easy.accuracy < 85) w.push('Basic foundational skills');
        if (hard.firstAccuracy < 50) w.push('First-time problem solving');
        if (medium.firstAccuracy < 60) w.push('Immediate comprehension');
        return w.slice(0, 3);
    }

    getLastActivity(userData) {
        let latest = 0;
        Object.values(userData.gameMetrics || {}).forEach(level => {
            const ts = level?.timestamp;
            if (ts) {
                const time = typeof ts === 'number' ? ts : (ts.seconds ? ts.seconds * 1000 : 0);
                if (time > latest) latest = time;
            }
        });
        return latest ? new Date(latest).toLocaleDateString() : 'No activity';
    }
}