import { db } from './firebaseInit.js';
import { 
    leaderboardView, leaderboardList, leaderboardLoading, 
    leaderboardError, timeFilter, gradeFilter 
} from './domElements.js';

// Leaderboard functionality
export function setupLeaderboard() {
    // Set up filter change events
    timeFilter.addEventListener('change', loadLeaderboard);
    gradeFilter.addEventListener('change', loadLeaderboard);
    
    // Load leaderboard when view is shown
    leaderboardView.addEventListener('view:show', loadLeaderboard);
}

export function loadLeaderboard() {
    showLeaderboardLoading();
    
    const timeRange = timeFilter.value;
    const grade = gradeFilter.value;
    
    let usersQuery = db.collection('users');
    
    // Apply grade filter if not "all-grades"
    if (grade !== 'all-grades') {
        const gradeValue = grade.replace('grade-', 'Grade ');
        usersQuery = usersQuery.where('grade', '==', gradeValue);
    }
    
    usersQuery.orderBy('totalScore', 'desc').get()
        .then((querySnapshot) => {
            hideLeaderboardLoading();
            
            if (querySnapshot.empty) {
                leaderboardList.innerHTML = '<div class="no-data">No student data available yet.</div>';
                return;
            }
            
            leaderboardList.innerHTML = '';
            let rank = 1;
            
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const leaderboardItem = createLeaderboardItem(userData, rank);
                leaderboardList.appendChild(leaderboardItem);
                rank++;
            });
        })
        .catch((error) => {
            hideLeaderboardLoading();
            showLeaderboardError('Failed to load leaderboard: ' + error.message);
        });
}

function createLeaderboardItem(userData, rank) {
    const div = document.createElement('div');
    div.className = 'leaderboard-item' + (rank <= 3 ? ' top-3' : '');
    
    div.innerHTML = `
        <div class="leaderboard-rank">${rank}</div>
        <div class="leaderboard-user">
            <div class="leaderboard-name">${userData.name || 'Unknown'} ${userData.surname || ''}</div>
            <div class="leaderboard-details">
                <span class="leaderboard-school">${userData.grade || 'Unknown Grade'}</span>
                ${userData.school ? `<span>${userData.school}</span>` : ''}
            </div>
        </div>
        <div class="leaderboard-points">
            <div class="points-score">${userData.totalScore || 0} pts</div>
            <div class="points-coins">${userData.totalCoins || 0} coins</div>
        </div>
    `;
    
    return div;
}

function showLeaderboardLoading() {
    leaderboardLoading.classList.remove('hidden');
    leaderboardError.classList.add('hidden');
}

function hideLeaderboardLoading() {
    leaderboardLoading.classList.add('hidden');
}

function showLeaderboardError(message) {
    leaderboardError.textContent = message;
    leaderboardError.classList.remove('hidden');
}