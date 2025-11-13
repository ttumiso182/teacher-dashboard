// Analytics Renderer - Handles UI updates and rendering
export class AnalyticsRenderer {
    constructor() {
        this.studentsData = null;
    }

    initialize(studentsData) {
        this.studentsData = studentsData;
        this.updateDashboard(studentsData);
        this.setupEventListeners();
    }

    updateDashboard(studentsData) {
        this.updateRiskOverview(studentsData);
        this.updateDifficultyPerformance(studentsData);
        this.updateAtRiskStudentsTable(studentsData);
        this.updateStudentSelector(studentsData);
    }

    updateRiskOverview(studentsData) {
        const riskCounts = { low: 0, medium: 0, high: 0 };

        studentsData.forEach(student => {
            riskCounts[student.riskLevel]++;
        });

        document.querySelector('.low-risk .risk-count').textContent = `${riskCounts.low} Students`;
        document.querySelector('.medium-risk .risk-count').textContent = `${riskCounts.medium} Students`;
        document.querySelector('.high-risk .risk-count').textContent = `${riskCounts.high} Students`;
    }

    updateDifficultyPerformance(studentsData) {
        const averages = { 
            easy: { accuracy: 0, firstTryAccuracy: 0 }, 
            medium: { accuracy: 0, firstTryAccuracy: 0 }, 
            hard: { accuracy: 0, firstTryAccuracy: 0 } 
        };
        let studentCount = studentsData.size;

        studentsData.forEach(student => {
            ['easy', 'medium', 'hard'].forEach(difficulty => {
                averages[difficulty].accuracy += student.difficultyPerformance[difficulty].accuracy;
                averages[difficulty].firstTryAccuracy += student.difficultyPerformance[difficulty].firstTryAccuracy;
            });
        });

        // Update UI
        ['easy', 'medium', 'hard'].forEach(difficulty => {
            const avgAccuracy = Math.round(averages[difficulty].accuracy / studentCount) || 0;
            const avgFirstTry = Math.round(averages[difficulty].firstTryAccuracy / studentCount) || 0;
            
            document.querySelector(`.${difficulty}-accuracy`).textContent = `${avgAccuracy}%`;
            document.querySelector(`.${difficulty}-first-try`).textContent = `${avgFirstTry}%`;
        });
    }

    updateAtRiskStudentsTable(studentsData) {
        const tableBody = document.querySelector('#at-risk-students-table tbody');
        tableBody.innerHTML = '';

        // Sort students by risk level (high first, then medium)
        const atRiskStudents = Array.from(studentsData.values())
            .filter(student => student.riskLevel !== 'low')
            .sort((a, b) => {
                const riskOrder = { high: 3, medium: 2, low: 1 };
                return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
            });

        atRiskStudents.forEach((student) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.displayName}</td>
                <td><span class="risk-badge ${student.riskLevel}">${student.riskLevel}</span></td>
                <td>${student.weaknesses.join(', ') || 'No specific weaknesses'}</td>
                <td>${student.lastActivity}</td>
                <td>
                    <button class="view-details-btn" data-userid="${student.userId}">View Details</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add empty state
        if (tableBody.children.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" style="text-align: center; color: #666; padding: 2rem;">
                    No at-risk students found. Great job!
                </td>
            `;
            tableBody.appendChild(row);
        }

        this.attachDetailButtonListeners();
    }

    updateStudentSelector(studentsData) {
        const select = document.getElementById('student-select');
        select.innerHTML = '<option value="">Select a student...</option>';

        // Sort students by name for easier selection
        const sortedStudents = Array.from(studentsData.values()).sort((a, b) => 
            a.displayName.localeCompare(b.displayName)
        );

        sortedStudents.forEach((student) => {
            const option = document.createElement('option');
            option.value = student.userId;
            option.textContent = `${student.displayName} (${student.riskLevel} risk)`;
            select.appendChild(option);
        });
    }

    showStudentDetails(userId) {
        const student = this.studentsData.get(userId);
        const detailView = document.getElementById('student-detail-view');
        
        if (student) {
            detailView.innerHTML = this.generateStudentDetailHTML(student);
            detailView.classList.remove('hidden');
            
            // Scroll to detail view smoothly
            setTimeout(() => {
                detailView.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    generateStudentDetailHTML(student) {
        const { easy, medium, hard } = student.difficultyPerformance;
        
        return `
            <div class="student-detail-header">
                <h4>${student.displayName}</h4>
                <div class="risk-badge ${student.riskLevel}">${student.riskLevel.toUpperCase()} RISK</div>
            </div>
            
            <div class="performance-breakdown">
                <h5>Performance Breakdown</h5>
                <div class="performance-grid">
                    <div class="performance-item">
                        <label>Easy Level:</label>
                        <span>${easy.accuracy}% accuracy (${easy.firstTryAccuracy}% first try)</span>
                    </div>
                    <div class="performance-item">
                        <label>Medium Level:</label>
                        <span>${medium.accuracy}% accuracy (${medium.firstTryAccuracy}% first try)</span>
                    </div>
                    <div class="performance-item">
                        <label>Hard Level:</label>
                        <span>${hard.accuracy}% accuracy (${hard.firstTryAccuracy}% first try)</span>
                    </div>
                </div>
            </div>
            
            <div class="identified-weaknesses">
                <h5>Areas Needing Improvement</h5>
                <ul>
                    ${student.weaknesses.map(weakness => `<li>${weakness}</li>`).join('')}
                    ${student.weaknesses.length === 0 ? '<li>No specific weaknesses identified</li>' : ''}
                </ul>
            </div>
            
            <div class="recommendations">
                <h5>Recommended Actions</h5>
                <p>${this.generateRecommendations(student)}</p>
            </div>
        `;
    }

    generateRecommendations(student) {
        const recommendations = [];
        const { easy, medium, hard } = student.difficultyPerformance;
        
        if (student.riskLevel === 'high') {
            recommendations.push("Schedule one-on-one intervention sessions");
        }
        
        if (hard.accuracy < 70) {
            recommendations.push("Provide additional practice with challenging concepts");
        }
        
        if (medium.accuracy < 80) {
            recommendations.push("Focus on building foundational knowledge before advancing");
        }
        
        if (easy.accuracy < 90) {
            recommendations.push("Review fundamental concepts with targeted exercises");
        }
        
        if (hard.firstTryAccuracy < 60) {
            recommendations.push("Encourage slower, more deliberate problem-solving");
        }
        
        if (recommendations.length === 0) {
            return "Student is performing well overall. Continue with current learning path and provide enrichment activities.";
        }
        
        return recommendations.join('. ') + '.';
    }

    attachDetailButtonListeners() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userid;
                this.showStudentDetails(userId);
            });
        });
    }

    setupEventListeners() {
        const studentSelect = document.getElementById('student-select');
        if (studentSelect) {
            studentSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.showStudentDetails(e.target.value);
                } else {
                    this.hideStudentDetails();
                }
            });
        }
    }

    hideStudentDetails() {
        const detailView = document.getElementById('student-detail-view');
        detailView.classList.add('hidden');
    }

    showErrorState(message) {
        const analyticsContainer = document.querySelector('.analytics-container');
        analyticsContainer.innerHTML = `
            <div class="error-message">
                <h3>Unable to Load Analytics</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
}