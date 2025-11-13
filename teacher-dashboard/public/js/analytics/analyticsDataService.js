// js/analytics/analyticsDataService.js

export class AnalyticsDataService {
    constructor() {
        this.studentsData = new Map();
        this.aggregatedData = {
            totalStudents: 0,
            avgPerformance: 0,
            avgProgression: 0,
            completionRate: 0,
            avgTimeSpent: 0
        };
    }

    async loadAllStudentsData() {
        try {
            console.log('🔍 Loading all students data from Firestore...');
            
            if (!firebase || !firebase.firestore) {
                throw new Error('Firebase Firestore is not properly initialized');
            }

            const usersSnapshot = await firebase.firestore().collection('users').get();
            
            console.log(`📊 Found ${usersSnapshot.size} total users in Firestore`);
            
            if (usersSnapshot.empty) {
                console.log('No users found in Firestore');
                this.studentsData.clear();
                return this.studentsData;
            }

            const students = [];
            let usersWithGameData = 0;
            let usersWithoutGameData = 0;
            
            usersSnapshot.forEach((userDoc) => {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                const studentPerformance = this.analyzeStudentPerformance(userId, userData);
                students.push(studentPerformance);
                
                if (studentPerformance.hasGameData) {
                    usersWithGameData++;
                } else {
                    usersWithoutGameData++;
                }
            });

            this.studentsData.clear();
            students.forEach(student => {
                this.studentsData.set(student.userId, student);
            });

            this.calculateAggregatedData(students);

            console.log(`✅ Loaded data for ${usersWithGameData} students with game data`);
            console.log(`❌ ${usersWithoutGameData} users without game data`);
            
            return this.studentsData;
        } catch (error) {
            console.error('💥 Error loading students data from Firestore:', error);
            throw error;
        }
    }

    analyzeStudentPerformance(userId, userData) {
        const performance = {
            userId: userId,
            displayName: userData.displayName || userData.email || `Student ${userId.substring(0, 8)}...`,
            riskLevel: 'none',
            weaknesses: [],
            hasGameData: false,
            lastActivity: this.getLastActivity(userData),
            levelPerformance: {}, // Detailed performance by level and part
            overallPerformance: {
                easy: { accuracy: 0, totalAttempts: 0, correctMatches: 0, firstTryAccuracy: 0 },
                medium: { accuracy: 0, totalAttempts: 0, correctMatches: 0, firstTryAccuracy: 0 },
                hard: { accuracy: 0, totalAttempts: 0, correctMatches: 0, firstTryAccuracy: 0 }
            },
            totalAttempts: 0,
            progress: userData.progress || {},
            gameMetrics: userData.gameMetrics || {}
        };

        // Process all level parts (level1_part1, level1_part2, etc.)
        if (userData.gameMetrics && typeof userData.gameMetrics === 'object') {
            const levelKeys = Object.keys(userData.gameMetrics);
            
            if (levelKeys.length > 0) {
                performance.hasGameData = true;
                
                levelKeys.forEach(levelKey => {
                    const levelData = userData.gameMetrics[levelKey];
                    performance.levelPerformance[levelKey] = this.analyzeLevelPart(levelKey, levelData);
                    
                    // Aggregate to overall performance
                    this.aggregateToOverallPerformance(performance, levelData);
                });

                // Calculate risk based on actual performance
                performance.riskLevel = this.calculateRiskLevel(performance);
                performance.weaknesses = this.identifySpecificWeaknesses(performance);
            }
        }

        return performance;
    }

    analyzeLevelPart(levelKey, levelData) {
        const levelAnalysis = {
            partName: levelKey,
            hasAttempts: false,
            difficulties: {
                easy: { accuracy: 0, attempts: 0, correct: 0, firstTryCorrect: 0, timeSpent: 0 },
                medium: { accuracy: 0, attempts: 0, correct: 0, firstTryCorrect: 0, timeSpent: 0 },
                hard: { accuracy: 0, attempts: 0, correct: 0, firstTryCorrect: 0, timeSpent: 0 }
            },
            completionStatus: 'not_started',
            commonErrors: [],
            lastAttempt: null
        };

        if (!levelData || !levelData.performance) {
            return levelAnalysis;
        }

        const perf = levelData.performance;
        
        // Process each difficulty level
        ['Easy', 'Medium', 'Hard'].forEach(diff => {
            const difficultyKey = diff.toLowerCase();
            const attempts = perf.attemptsPerDifficulty?.[diff] || 0;
            const correct = perf.correctMatchesPerDifficulty?.[diff] || 0;
            const firstTryCorrect = perf.firstTryCorrect?.[diff] || 0;
            const timeSpent = perf.timeSpentPerDifficulty?.[diff] || 0;

            levelAnalysis.difficulties[difficultyKey] = {
                accuracy: attempts > 0 ? (correct / attempts) * 100 : 0,
                attempts: attempts,
                correct: correct,
                firstTryCorrect: firstTryCorrect,
                firstTryAccuracy: attempts > 0 ? (firstTryCorrect / attempts) * 100 : 0,
                timeSpent: timeSpent
            };

            if (attempts > 0) {
                levelAnalysis.hasAttempts = true;
            }
        });

        // Determine completion status
        if (levelAnalysis.hasAttempts) {
            const setsCompleted = levelData.progression?.setsCompletedPerDifficulty;
            if (setsCompleted) {
                const totalSets = Object.values(setsCompleted).reduce((sum, val) => sum + val, 0);
                levelAnalysis.completionStatus = totalSets >= 3 ? 'completed' : 'in_progress';
            } else {
                levelAnalysis.completionStatus = 'attempted';
            }
        }

        // Extract common errors
        if (levelData.commonErrors) {
            levelAnalysis.commonErrors = Object.entries(levelData.commonErrors)
                .sort((a, b) => b[1] - a[1]) // Sort by frequency
                .slice(0, 3) // Top 3 errors
                .map(([error, count]) => `${error} (${count} times)`);
        }

        levelAnalysis.lastAttempt = levelData.timestamp ? new Date(levelData.timestamp).toLocaleDateString() : null;

        return levelAnalysis;
    }

    aggregateToOverallPerformance(performance, levelData) {
        if (!levelData.performance) return;

        const perf = levelData.performance;
        const overall = performance.overallPerformance;

        ['Easy', 'Medium', 'Hard'].forEach(diff => {
            const difficultyKey = diff.toLowerCase();
            const attempts = perf.attemptsPerDifficulty?.[diff] || 0;
            const correct = perf.correctMatchesPerDifficulty?.[diff] || 0;
            const firstTryCorrect = perf.firstTryCorrect?.[diff] || 0;

            overall[difficultyKey].totalAttempts += attempts;
            overall[difficultyKey].correctMatches += correct;
            overall[difficultyKey].firstTryCorrect += firstTryCorrect;
            performance.totalAttempts += attempts;
        });

        // Calculate final accuracies
        ['easy', 'medium', 'hard'].forEach(diff => {
            const perf = overall[diff];
            if (perf.totalAttempts > 0) {
                perf.accuracy = (perf.correctMatches / perf.totalAttempts) * 100;
                perf.firstTryAccuracy = (perf.firstTryCorrect / perf.totalAttempts) * 100;
            }
        });
    }

    calculateRiskLevel(performance) {
        if (!performance.hasGameData || performance.totalAttempts === 0) {
            return 'none';
        }

        const { easy, medium, hard } = performance.overallPerformance;
        let riskScore = 0;

        // Only consider difficulties that were attempted
        if (hard.totalAttempts > 0 && hard.accuracy < 50) riskScore += 3;
        else if (hard.totalAttempts > 0 && hard.accuracy < 65) riskScore += 2;
        
        if (medium.totalAttempts > 0 && medium.accuracy < 60) riskScore += 2;
        else if (medium.totalAttempts > 0 && medium.accuracy < 75) riskScore += 1;
        
        if (easy.totalAttempts > 0 && easy.accuracy < 75) riskScore += 1;

        // Check if struggling in multiple level parts
        const strugglingParts = this.countStrugglingParts(performance);
        if (strugglingParts >= 2) riskScore += 2;

        return riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low';
    }

    countStrugglingParts(performance) {
        let strugglingCount = 0;
        
        Object.values(performance.levelPerformance).forEach(level => {
            if (level.hasAttempts) {
                const { easy, medium, hard } = level.difficulties;
                
                // A part is struggling if accuracy is low in attempted difficulties
                let partScore = 0;
                if (easy.attempts > 0 && easy.accuracy < 70) partScore++;
                if (medium.attempts > 0 && medium.accuracy < 60) partScore++;
                if (hard.attempts > 0 && hard.accuracy < 50) partScore++;
                
                if (partScore >= 2) strugglingCount++;
            }
        });
        
        return strugglingCount;
    }

    identifySpecificWeaknesses(performance) {
        const weaknesses = [];
        
        if (!performance.hasGameData || performance.totalAttempts === 0) {
            return ['No game attempts'];
        }

        const { easy, medium, hard } = performance.overallPerformance;

        // Difficulty-specific weaknesses
        if (hard.totalAttempts > 0 && hard.accuracy < 60) {
            weaknesses.push(`Struggling with Hard difficulty (${Math.round(hard.accuracy)}% accuracy)`);
        }
        
        if (medium.totalAttempts > 0 && medium.accuracy < 70) {
            weaknesses.push(`Needs improvement in Medium difficulty (${Math.round(medium.accuracy)}% accuracy)`);
        }
        
        if (easy.totalAttempts > 0 && easy.accuracy < 80) {
            weaknesses.push(`Basic concepts need reinforcement (${Math.round(easy.accuracy)}% accuracy)`);
        }

        // First-try performance issues
        if (hard.firstTryAccuracy < 40) {
            weaknesses.push('Poor first-attempt performance on challenging content');
        }

        // Level part specific issues
        const partWeaknesses = this.identifyPartSpecificWeaknesses(performance);
        weaknesses.push(...partWeaknesses);

        return weaknesses.length > 0 ? weaknesses.slice(0, 3) : ['Performing well across all areas'];
    }

    identifyPartSpecificWeaknesses(performance) {
        const partWeaknesses = [];
        
        Object.entries(performance.levelPerformance).forEach(([partName, partData]) => {
            if (partData.hasAttempts) {
                const { easy, medium, hard } = partData.difficulties;
                let partAccuracy = 0;
                let totalWeight = 0;
                
                if (easy.attempts > 0) {
                    partAccuracy += easy.accuracy;
                    totalWeight++;
                }
                if (medium.attempts > 0) {
                    partAccuracy += medium.accuracy;
                    totalWeight++;
                }
                if (hard.attempts > 0) {
                    partAccuracy += hard.accuracy;
                    totalWeight++;
                }
                
                const avgPartAccuracy = totalWeight > 0 ? partAccuracy / totalWeight : 0;
                
                if (avgPartAccuracy < 60) {
                    partWeaknesses.push(`Struggling in ${partName} (${Math.round(avgPartAccuracy)}% accuracy)`);
                }
                
                // Add common errors as specific weaknesses
                if (partData.commonErrors.length > 0) {
                    partWeaknesses.push(`Common errors in ${partName}: ${partData.commonErrors[0]}`);
                }
            }
        });
        
        return partWeaknesses;
    }

    calculateAggregatedData(students) {
        const studentsWithAttempts = students.filter(s => s.hasGameData && s.totalAttempts > 0);
        
        if (studentsWithAttempts.length === 0) {
            this.aggregatedData = {
                totalStudents: students.length,
                avgPerformance: 0,
                avgProgression: 0,
                completionRate: 0,
                avgTimeSpent: 0,
                activeStudents: 0
            };
            return;
        }

        let totalPerformance = 0;
        let totalProgression = 0;
        let totalCompletion = 0;

        studentsWithAttempts.forEach(student => {
            const perf = student.overallPerformance;
            
            // Average performance across attempted difficulties
            let difficultiesWithAttempts = 0;
            let studentPerformanceSum = 0;
            
            if (perf.easy.totalAttempts > 0) {
                studentPerformanceSum += perf.easy.accuracy;
                difficultiesWithAttempts++;
            }
            if (perf.medium.totalAttempts > 0) {
                studentPerformanceSum += perf.medium.accuracy;
                difficultiesWithAttempts++;
            }
            if (perf.hard.totalAttempts > 0) {
                studentPerformanceSum += perf.hard.accuracy;
                difficultiesWithAttempts++;
            }
            
            const avgStudentPerformance = difficultiesWithAttempts > 0 ? studentPerformanceSum / difficultiesWithAttempts : 0;
            totalPerformance += avgStudentPerformance;
            
            // Progression based on completion of level parts
            const completedParts = Object.values(student.levelPerformance).filter(part => 
                part.completionStatus === 'completed'
            ).length;
            const totalParts = Object.keys(student.levelPerformance).length;
            const studentProgression = totalParts > 0 ? (completedParts / totalParts) * 100 : 0;
            totalProgression += studentProgression;
            
            totalCompletion += studentProgression; // Using progression as completion rate
        });

        this.aggregatedData = {
            totalStudents: students.length,
            avgPerformance: Math.round(totalPerformance / studentsWithAttempts.length),
            avgProgression: Math.round(totalProgression / studentsWithAttempts.length),
            completionRate: Math.round(totalCompletion / studentsWithAttempts.length),
            avgTimeSpent: 15, // Could be calculated from timeSpentPerDifficulty
            activeStudents: studentsWithAttempts.length
        };
    }

    getLastActivity(userData) {
        let latestTimestamp = 0;
        
        if (userData.gameMetrics) {
            Object.values(userData.gameMetrics).forEach(levelData => {
                if (levelData && levelData.timestamp && levelData.timestamp > latestTimestamp) {
                    latestTimestamp = levelData.timestamp;
                }
            });
        }

        if (latestTimestamp > 0) {
            return new Date(latestTimestamp).toLocaleDateString();
        }
        
        return 'No recent activity';
    }

    getAggregatedData() {
        return this.aggregatedData;
    }

    // New method to get detailed level performance for a student
    getStudentLevelPerformance(userId) {
        const student = this.studentsData.get(userId);
        return student ? student.levelPerformance : null;
    }

    // New method to get students struggling in specific level parts
    getStudentsStrugglingInPart(partName) {
        return Array.from(this.studentsData.values()).filter(student => {
            const part = student.levelPerformance[partName];
            return part && part.hasAttempts && (
                part.difficulties.easy.accuracy < 70 ||
                part.difficulties.medium.accuracy < 60 ||
                part.difficulties.hard.accuracy < 50
            );
        });
    }
}