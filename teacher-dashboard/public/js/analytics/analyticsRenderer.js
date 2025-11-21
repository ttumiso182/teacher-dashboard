// analyticsRenderer.js - FINAL WITH REAL NAMES
export class AnalyticsRenderer {
    constructor() { this.studentsData = null; }

    initialize(studentsData) {
        this.studentsData = studentsData;
        this.updateDashboard();
        this.setupEventListeners();
    }

    updateDashboard() {
        this.updateRiskOverview();
        this.updateDifficultyPerformance();
        this.updateAtRiskTable();
        this.updateStudentSelector();
    }

    updateRiskOverview() {
        const counts = { low: 0, medium: 0, high: 0 };
        this.studentsData.forEach(s => counts[s.riskLevel]++);
        ['low', 'medium', 'high'].forEach(l => {
            document.querySelector(`.${l}-risk .risk-count`).textContent = `${counts[l]} Students`;
        });
    }

    updateDifficultyPerformance() {
        const avg = { easy: 0, medium: 0, hard: 0 };
        const first = { easy: 0, medium: 0, hard: 0 };
        const n = this.studentsData.size || 1;

        this.studentsData.forEach(s => {
            ['easy', 'medium', 'hard'].forEach(d => {
                avg[d] += s.difficultyPerformance[d].accuracy;
                first[d] += s.difficultyPerformance[d].firstAccuracy;
            });
        });

        ['easy', 'medium', 'hard'].forEach(d => {
            document.querySelector(`.${d}-accuracy`).textContent = `${Math.round(avg[d] / n)}%`;
            document.querySelector(`.${d}-first-try`).textContent = `${Math.round(first[d] / n)}%`;
        });
    }

// Only the table row part needs to change – rest stays the same
    updateAtRiskTable() {
        const tbody = document.querySelector('#at-risk-students-table tbody') || document.querySelector('table tbody');
        tbody.innerHTML = '';

        const atRisk = [...this.studentsData.values()]
            .filter(s => s.riskLevel !== 'low')
            .sort((a, b) => b.riskLevel === 'high' ? -1 : 1);

        if (!atRisk.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#666;">No at-risk students found. Great job!</td></tr>`;
            return;
        }

        atRisk.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${s.displayName}</strong><br><small>${s.grade} • ${s.school}</small></td>
                <td><span class="risk-badge ${s.riskLevel}">${s.riskLevel.toUpperCase()}</span></td>
                <td>${s.weaknesses.join(', ') || '—'}</td>
                <td>${s.lastActivity}</td>
                <td><button class="view-details-btn" data-userid="${s.userId}">View Details</button></td>
            `;
            tbody.appendChild(row);
        });

        this.attachDetailButtons();
    }

    updateStudentSelector() {
        const select = document.getElementById('student-select');
        if (!select) return;
        select.innerHTML = '<option value="">Select a student...</option>';
        [...this.studentsData.values()]
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .forEach(s => select.add(new Option(`${s.displayName} (${s.riskLevel} risk)`, s.userId)));
    }

    showStudentDetails(userId) {
        const s = this.studentsData.get(userId);
        if (!s) return;

        const { easy, medium, hard } = s.difficultyPerformance;

        document.getElementById('student-detail-view').innerHTML = `
            <div class="student-detail-header">
                <h4>${s.displayName}</h4>
                <div class="risk-badge ${s.riskLevel}">${s.riskLevel.toUpperCase()} RISK</div>
            </div>

            <div class="performance-breakdown">
                <h5>Performance by Difficulty</h5>
                <div class="performance-grid">
                    <div>Easy:   <strong>${easy.accuracy}%</strong> (${easy.firstAccuracy}% first try)</div>
                    <div>Medium: <strong>${medium.accuracy}%</strong> (${medium.firstAccuracy}% first try)</div>
                    <div>Hard:   <strong>${hard.accuracy}%</strong> (${hard.firstAccuracy}% first try)</div>
                </div>
            </div>

            <div class="identified-weaknesses">
                <h5>Areas Needing Attention</h5>
                <ul>
                    ${s.weaknesses.length ? s.weaknesses.map(w => `<li>${w}</li>`).join('') 
                        : '<li>No major issues detected</li>'}
                </ul>
            </div>

            <!-- THIS IS THE NEW SECTION YOU WANTED -->
            <div class="teacher-recommendations">
                <h5>Recommended Teacher Actions</h5>
                <div class="recommendation-list">
                    ${this.generateTeacherRecommendations(s)}
                </div>
            </div>
        `;

        document.getElementById('student-detail-view').classList.remove('hidden');
        document.getElementById('student-detail-view').scrollIntoView({ behavior: 'smooth' });
    }

    attachDetailButtons() {
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.onclick = () => this.showStudentDetails(btn.dataset.userid);
        });
    }

    setupEventListeners() {
        const select = document.getElementById('student-select');
        if (select) select.onchange = e => e.target.value ? this.showStudentDetails(e.target.value) : this.hideStudentDetails();
    }

    hideStudentDetails() {
        document.getElementById('student-detail-view')?.classList.add('hidden');
    }

    generateTeacherRecommendations(s) {
        const recs = [];

        if (s.riskLevel === 'high') {
            recs.push("⚡ <strong>Urgent one-on-one intervention needed this week</strong>");
            recs.push("• Schedule a 15–20 min private session with the student");
            recs.push("• Contact parent/guardian to discuss home support");
        } else if (s.riskLevel === 'medium') {
            recs.push("⚡ <strong>Plan targeted support within the next 2 weeks</strong>");
        }

        const { easy, medium, hard } = s.difficultyPerformance;

        if (hard.accuracy < 60) {
            recs.push("• Provide simpler real-life examples of the hard concepts (e.g. word problems with visuals)");
            recs.push("• Pair student with a stronger peer for hard levels");
            recs.push("• Assign 5–10 extra hard questions as homework with step-by-step hints");
        }
        if (medium.accuracy < 70) {
            recs.push("• Re-teach medium concepts in small group during break or after school");
            recs.push("• Use manipulatives or drawings to make abstract ideas concrete");
        }
        if (easy.accuracy < 85) {
            recs.push("• Quick 5-minute daily review of basic facts (flash cards, speed drills)");
            recs.push("• Check for gaps in earlier grades – student may have missed foundation");
        }
        if (hard.firstAccuracy < 50 || medium.firstAccuracy < 60) {
            recs.push("• Teach “think-aloud” strategy – student must explain their reasoning out loud");
            recs.push("• Encourage pausing before answering instead of guessing");
        }

        if (recs.length === 0) {
            return "<em>🎉 Student is performing well! Consider giving enrichment tasks or leadership role in group activities.</em>";
        }

        return recs.map(r => `<div class=\"rec-item\">${r}</div>`).join('');
    }
}

