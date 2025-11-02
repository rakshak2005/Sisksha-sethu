// Import Firebase functions
// Using version 12.5.0 as specified by user
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    onSnapshot, 
    collection, 
    updateDoc,
    writeBatch,
    query
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// --- 1. YOUR FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyDJ3KWmMB3hiCTvsyEjzMir4RfTH7yxdKg",
    authDomain: "lorship-675e3.firebaseapp.com",
    projectId: "lorship-675e3",
    storageBucket: "lorship-675e3.firebasestorage.app",
    messagingSenderId: "102623848351",
    appId: "1:102623848351:web:d72b4fd51cc74858cabfaa",
    measurementId: "G-Z9CHLRRQQW"
};

// --- 3. MOCK DATA (Imported) ---
// Load data from separate files for easier maintenance.
import { internships } from './internships.js';
import { scholarships } from './scholarships.js';

// Combine the imported arrays into one master list
const allOpportunities = [...internships, ...scholarships];

// --- 4. GLOBAL STATE & FIREBASE INIT ---
let db, auth, userId;
// We remove 'bio' as it's no longer needed
let userProfile = { tracked: {} }; // Our local state
let currentView = 'search'; // 'search', 'tracker', 'calendar'

let draggedItem = null; // For drag and drop

// Declare els object globally, but leave it empty
let els; 

// --- 5. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    
    // NOW populate the els object, since the DOM is loaded
    els = {
        sidebar: document.getElementById('sidebar'),
        menuToggleButton: document.getElementById('menu-toggle-button'),
        menuToggleButtonTracker: document.getElementById('menu-toggle-button-tracker'),
        menuToggleButtonCalendar: document.getElementById('menu-toggle-button-calendar'),
        closeMenuButton: document.getElementById('close-menu-button'),
        navSearch: document.getElementById('nav-search'),
        navTracker: document.getElementById('nav-tracker'),
        navCalendar: document.getElementById('nav-calendar'),
        viewSearch: document.getElementById('view-search'),
        viewTracker: document.getElementById('view-tracker'),
        viewCalendar: document.getElementById('view-calendar'),
        searchBar: document.getElementById('search-bar'),
        typeSelect: document.getElementById('type'),
        sourceSelect: document.getElementById('source'),
        locationSelect: document.getElementById('location'),
        minAmountSlider: document.getElementById('minAmount'),
        minAmountLabel: document.getElementById('minAmountLabel'),
        sortSelect: document.getElementById('sort'),
        opportunityList: document.getElementById('opportunity-list'),
        opportunityCount: document.getElementById('opportunity-count'),
        // REMOVED profile modal elements
        loadingIndicator: document.getElementById('loading-indicator'),
        loadingText: document.getElementById('loading-text'),
        calendarGridNov: document.getElementById('calendar-grid-nov'),
        calendarGridDec: document.getElementById('calendar-grid-dec'),
        calendarModal: document.getElementById('calendar-modal'),
        closeCalendarModal: document.getElementById('close-calendar-modal'),
        calendarModalTitle: document.getElementById('calendar-modal-title'),
        calendarModalContent: document.getElementById('calendar-modal-content'),
    };

    initializeApp(firebaseConfig);
    auth = getAuth();
    db = getFirestore();
    
    signInAnonymously(auth).catch(error => {
        console.error("Anonymous Sign-In Error:", error);
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User signed in anonymously:", user.uid);
            userId = user.uid;
            loadUserData();
        } else {
            console.log("User signed out.");
            userId = null;
        }
    });

    addEventListeners();
    renderAll(); // Initial render
});

// --- 6. DATA & STATE MANAGEMENT (FIREBASE) ---

async function loadUserData() {
    if (!userId) return;
    const userRef = doc(db, "users", userId);
    
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            console.log("User data loaded:", docSnap.data());
            userProfile = docSnap.data();
            if (!userProfile.tracked) userProfile.tracked = {};
            // REMOVED bio handling
        } else {
            console.log("No user profile found, creating one.");
            setDoc(userRef, userProfile);
        }
        renderAll();
    });
}

// REMOVED saveUserBio function

async function trackOpportunity(opportunityId, status = "saved") {
    if (!userId) return;
    
    userProfile.tracked[opportunityId] = { status: status };
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, {
        [`tracked.${opportunityId}`]: { status: status }
    });
    console.log(`Opportunity ${opportunityId} status updated to ${status}`);
}

async function untrackOpportunity(opportunityId) {
    if (!userId || !userProfile.tracked[opportunityId]) return;
    
    delete userProfile.tracked[opportunityId]; 
    const userRef = doc(db, "users", userId);
    const newTracked = { ...userProfile.tracked };
    
    await updateDoc(userRef, { tracked: newTracked });
    console.log(`Opportunity ${opportunityId} untracked.`);
    renderAll();
}

async function updateOpportunityStatus(opportunityId, newStatus) {
    if (!userId || !userProfile.tracked[opportunityId]) return;
    
    userProfile.tracked[opportunityId].status = newStatus;
    const userRef = doc(db, "users", userId);
    
    await updateDoc(userRef, {
        [`tracked.${opportunityId}.status`]: newStatus
    });
    console.log(`Opportunity ${opportunityId} status changed to ${newStatus}`);
}

// --- 7. EVENT LISTENERS ---

function addEventListeners() {
    // Mobile Menu
    const openMenu = () => els.sidebar.style.display = 'flex';
    const closeMenu = () => els.sidebar.style.display = 'none';
    
    els.menuToggleButton.addEventListener('click', openMenu);
    els.menuToggleButtonTracker.addEventListener('click', openMenu);
    els.menuToggleButtonCalendar.addEventListener('click', openMenu);
    els.closeMenuButton.addEventListener('click', closeMenu);

    // Main Navigation
    els.navSearch.addEventListener('click', () => switchView('search'));
    els.navTracker.addEventListener('click', () => switchView('tracker'));
    els.navCalendar.addEventListener('click', () => switchView('calendar'));

    // Filters
    els.searchBar.addEventListener('input', renderAll);
    els.typeSelect.addEventListener('change', renderAll);
    els.sourceSelect.addEventListener('change', renderAll);
    els.locationSelect.addEventListener('change', renderAll);
    els.minAmountSlider.addEventListener('input', () => {
        els.minAmountLabel.textContent = els.minAmountSlider.value;
        renderAll();
    });
    els.sortSelect.addEventListener('change', renderAll);

    // REMOVED profile modal listeners
    
    // Calendar Modal
    els.closeCalendarModal.addEventListener('click', () => els.calendarModal.style.display = 'none');
    
    // Global click listeners for list items (Save button, etc)
    // This is the line that was failing before, but should now work.
    els.opportunityList.addEventListener('click', handleListClick);
    
    // Drag and Drop Listeners for Kanban Board
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
}

// --- 8. VIEW SWITCHING ---

function switchView(viewName) {
    currentView = viewName;
    
    els.viewSearch.style.display = 'none';
    els.viewTracker.style.display = 'none';
    els.viewCalendar.style.display = 'none';

    // Deactivate all nav links
    els.navSearch.classList.remove('active', 'bg-gray-800', 'text-cyan-400');
    els.navTracker.classList.remove('active', 'bg-gray-800', 'text-cyan-400');
    els.navCalendar.classList.remove('active', 'bg-gray-800', 'text-cyan-400');
    els.navSearch.classList.add('text-gray-400');
    els.navTracker.classList.add('text-gray-400');
    els.navCalendar.classList.add('text-gray-400');
    
    if (viewName === 'search') {
        els.viewSearch.style.display = 'block';
        els.navSearch.classList.add('active', 'bg-gray-800', 'text-cyan-400');
        els.navSearch.classList.remove('text-gray-400');
    } else if (viewName === 'tracker') {
        els.viewTracker.style.display = 'block';
        els.navTracker.classList.add('active', 'bg-gray-800', 'text-cyan-400');
        els.navTracker.classList.remove('text-gray-400');
    } else if (viewName === 'calendar') {
        els.viewCalendar.style.display = 'block';
        els.navCalendar.classList.add('active', 'bg-gray-800', 'text-cyan-400');
        els.navCalendar.classList.remove('text-gray-400');
    }

    // Close mobile sidebar on navigation
    if (window.innerWidth < 768) { // md breakpoint
        els.sidebar.style.display = 'none';
    }
    
    renderAll();
}

// --- 9. CORE RENDER LOGIC ---

function renderAll() {
    // Get current filter values
    const filters = {
        search: els.searchBar.value.toLowerCase(),
        type: els.typeSelect.value,
        source: els.sourceSelect.value, 
        location: els.locationSelect.value,
        amount: Number(els.minAmountSlider.value),
        sort: els.sortSelect.value
    };

    const filteredOpportunities = getFilteredOpportunities(filters);
    
    if (currentView === 'search') {
        renderOpportunityList(filteredOpportunities);
    } else if (currentView === 'tracker') {
        renderTrackerView();
    } else if (currentView === 'calendar') {
        renderCalendarView(filteredOpportunities);
    }
}

function getFilteredOpportunities(filters) {
    let filtered = [...allOpportunities];

    // Apply filters
    filtered = filtered.filter(opp => {
        const searchMatch = opp.title.toLowerCase().includes(filters.search) ||
                            opp.company.toLowerCase().includes(filters.search) ||
                            opp.skills.toLowerCase().includes(filters.search);
        
        const typeMatch = filters.type === 'all' || opp.type === filters.type;
        
        const sourceMatch = filters.source === 'all' || opp.source === filters.source;
        
        const locationMatch = filters.location === 'all' || opp.location === filters.location;
        
        const amountMatch = opp.amount >= filters.amount;

        return searchMatch && typeMatch && sourceMatch && locationMatch && amountMatch;
    });

    // Apply sorting
    filtered.sort((a, b) => {
        switch (filters.sort) {
            case 'deadline_asc':
                return new Date(a.applyBy) - new Date(b.applyBy);
            case 'amount_desc':
                return b.amount - a.amount;
            case 'amount_asc':
                return a.amount - b.amount;
            default:
                return 0;
        }
    });

    return filtered;
}

// --- 10. RENDER SEARCH VIEW ---

function renderOpportunityList(opportunities) {
    els.opportunityList.innerHTML = ''; // Clear list
    els.opportunityCount.textContent = opportunities.length;
    
    if (opportunities.length === 0) {
        els.opportunityList.innerHTML = `<div class="p-12 text-center text-gray-500">No opportunities found matching your filters.</div>`;
        return;
    }

    opportunities.forEach(opp => {
        const isTracked = userProfile.tracked.hasOwnProperty(opp.id);
        // REMOVED matchScore
        
        // Dynamic labels
        const amountLabel = opp.type === 'internship' ? 'Stipend' : 'Award';
        const amountSuffix = opp.type === 'internship' ? '/month' : '';
        const typeColor = opp.type === 'internship' ? 'bg-cyan-900 text-cyan-300' : 'bg-fuchsia-900 text-fuchsia-300';

        // Responsive row: stack on mobile, row on desktop
        const rowHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-800">
                <div class="flex-1 min-w-0">
                    <!-- Title, Type -->
                    <div class="flex items-center space-x-3 mb-1 flex-wrap">
                        <span class="text-xs font-medium ${typeColor} px-2 py-0.5 rounded-full uppercase">${opp.type}</span>
                        <h3 class="text-base font-semibold text-cyan-400 truncate">${opp.title}</h3>
                        <!-- REMOVED Match Score HTML -->
                    </div>
                    
                    <!-- Company -->
                    <p class="text-sm text-gray-400 mb-2">${opp.company}</p>
                    
                    <!-- Tags -->
                    <div class="flex flex-wrap gap-2 text-xs">
                        <span class="inline-flex items-center bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                            <svg class="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A11.953 11.953 0 0 1 12 13.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0a8.997 8.997 0 0 0-7.843 4.582M12 21a8.997 8.997 0 0 1-7.843-4.582" /></svg>
                            Source: ${opp.source}
                        </span>
                        <span class="inline-flex items-center bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                            <svg class="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                            ${opp.location}
                        </span>
                        <span class="inline-flex items-center bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                            <svg class="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.768 0-1.536.219-2.121.659L9 15.182Z" /></svg>
                            ${amountLabel}: ₹${opp.amount}${amountSuffix}
                        </span>
                        <span class="inline-flex items-center bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">
                            <svg class="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                            Apply by ${new Date(opp.applyBy).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                
                <!-- Buttons: stack on mobile, row on desktop -->
                <div class="flex flex-col sm:flex-row gap-2 ml-0 sm:ml-4 flex-shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
                    <a href="${opp.url}" target="_blank" class="px-3 py-1.5 text-sm font-medium text-center text-cyan-400 bg-gray-800 border border-cyan-500 rounded-md hover:bg-gray-700 w-full sm:w-auto">
                        View & Apply
                    </a>
                    <button 
                        data-id="${opp.id}" 
                        class="save-button px-3 py-1.5 text-sm font-medium text-center ${isTracked ? 'bg-gray-700 text-gray-400' : 'bg-cyan-600 text-white hover:bg-cyan-700'} rounded-md w-full sm:w-auto">
                        ${isTracked ? 'Saved' : 'Save'}
                    </button>
                </div>
            </div>
        `;
        els.opportunityList.innerHTML += rowHTML;
    });
}

function getScoreColor(score) {
    if (score > 85) return 'bg-green-900 text-green-300';
    if (score > 65) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
}

function handleListClick(e) {
    // This is the function you posted, it is correct.
    const button = e.target.closest('.save-button');
    if (!button) return;

    const opportunityId = button.dataset.id;
    const isTracked = userProfile.tracked.hasOwnProperty(opportunityId);

    if (isTracked) {
        untrackOpportunity(opportunityId);
        button.textContent = 'Save';
        button.classList.remove('bg-gray-700', 'text-gray-400');
        button.classList.add('bg-cyan-600', 'text-white', 'hover:bg-cyan-700');
    } else {
        trackOpportunity(opportunityId, 'saved');
        button.textContent = 'Saved';
        button.classList.add('bg-gray-700', 'text-gray-400');
        button.classList.remove('bg-cyan-600', 'text-white', 'hover:bg-cyan-700');
    }
}

// --- 11. RENDER TRACKER VIEW (KANBAN) ---

function renderTrackerView() {
    const columns = {
        saved: document.getElementById('kanban-saved'),
        progress: document.getElementById('kanban-progress'),
        submitted: document.getElementById('kanban-submitted')
    };
    
    columns.saved.innerHTML = '';
    columns.progress.innerHTML = '';
    columns.submitted.innerHTML = '';
    
    const trackedIds = Object.keys(userProfile.tracked);
    
    if (trackedIds.length === 0) {
        columns.saved.innerHTML = `<p class="text-sm text-gray-500 p-4 text-center">No saved opportunities. Go to the Search tab to find and save some!</p>`;
        return;
    }
    
    trackedIds.forEach(id => {
        const opp = allOpportunities.find(i => i.id === id);
        if (!opp) return;
        
        const status = userProfile.tracked[id].status || 'saved';
        const typeColor = opp.type === 'internship' ? 'bg-cyan-900 text-cyan-300' : 'bg-fuchsia-900 text-fuchsia-300';
        
        const cardHTML = `
            <div class="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 cursor-grab active:cursor-grabbing" draggable="true" data-id="${id}">
                <span class="text-xs font-medium ${typeColor} px-2 py-0.5 rounded-full uppercase mb-2 inline-block">${opp.type}</span>
                <h4 class="font-semibold text-gray-200">${opp.title}</h4>
                <p class="text-sm text-gray-400 mb-3">${opp.company}</p>
                <a href="${opp.url}" target="_blank" class="text-sm font-medium text-cyan-400 hover:underline">
                    View & Apply
                </a>
                <button data-id="${id}" class="untrack-button text-xs text-red-400 hover:underline float-right">Remove</button>
            </div>
        `;
        
        if (columns[status]) {
            columns[status].innerHTML += cardHTML;
        }
    });
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.untrack-button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const confirmed = await showModalConfirm('Are you sure you want to remove this from your tracker?');
            if (confirmed) {
                untrackOpportunity(id);
            }
        });
    });
}


// --- 12. KANBAN DRAG & DROP HANDLERS ---

function handleDragStart(e) {
    if (e.target.hasAttribute('draggable')) {
        draggedItem = e.target;
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    }
}

function handleDragOver(e) {
    e.preventDefault(); 
    const column = e.target.closest('.kanban-column');
    if (column) {
        column.style.background = '#030712'; // gray-950 highlight
    }
}

function handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.kanban-column');
    if (column && draggedItem) {
        const newStatus = column.dataset.status;
        const opportunityId = draggedItem.dataset.id;
        
        column.appendChild(draggedItem);
        updateOpportunityStatus(opportunityId, newStatus);
    }
    document.querySelectorAll('.kanban-column').forEach(c => c.style.background = 'transparent');
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.style.opacity = '1';
        draggedItem = null;
    }
    document.querySelectorAll('.kanban-column').forEach(c => c.style.background = 'transparent');
}

// --- 13. RENDER CALENDAR VIEW ---

function renderCalendarView(filteredOpportunities) {
    const novGrid = els.calendarGridNov;
    novGrid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        novGrid.innerHTML += `<div class="bg-gray-800/50 border-r border-b border-gray-700 min-h-[6rem]"></div>`;
    }
    for (let day = 1; day <= 30; day++) {
        const date = `2025-11-${String(day).padStart(2, '0')}`;
        const deadlines = filteredOpportunities.filter(i => i.applyBy === date);
        
        novGrid.innerHTML += `
            <div class="calendar-day h-24 p-1.5 bg-gray-800 border-r border-b border-gray-700 overflow-hidden" data-date="${date}">
                <div class="text-xs font-semibold text-gray-300">${day}</div>
                <div class="text-xs space-y-1 mt-1">
                    ${deadlines.map(d => `
                        <p class="${d.type === 'internship' ? 'bg-cyan-900 text-cyan-300' : 'bg-fuchsia-900 text-fuchsia-300'} p-1 rounded truncate cursor-pointer" data-id="${d.id}">${d.title}</p>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const decGrid = els.calendarGridDec;
    decGrid.innerHTML = '';
    decGrid.innerHTML += `<div class="bg-gray-800/50 border-r border-b border-gray-700 min-h-[6rem]"></div>`;
    for (let day = 1; day <= 31; day++) {
        const date = `2025-12-${String(day).padStart(2, '0')}`;
        const deadlines = filteredOpportunities.filter(i => i.applyBy === date);
        
        decGrid.innerHTML += `
            <div class="calendar-day h-24 p-1.5 bg-gray-800 border-r border-b border-gray-700 overflow-hidden" data-date="${date}">
                <div class="text-xs font-semibold text-gray-300">${day}</div>
                <div class="text-xs space-y-1 mt-1">
                    ${deadlines.map(d => `
                        <p class="${d.type === 'internship' ? 'bg-cyan-900 text-cyan-300' : 'bg-fuchsia-900 text-fuchsia-300'} p-1 rounded truncate cursor-pointer" data-id="${d.id}">${d.title}</p>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    document.querySelectorAll('.calendar-day').forEach(dayEl => {
        dayEl.addEventListener('click', (e) => {
            const date = dayEl.dataset.date;
            const deadlines = filteredOpportunities.filter(i => i.applyBy === date);
            
            if (deadlines.length > 0) {
                els.calendarModalTitle.textContent = `Deadlines for ${new Date(date + 'T00:00:00').toLocaleDateString()}`;
                els.calendarModalContent.innerHTML = deadlines.map(d => `
                    <div class="p-3 bg-gray-700 rounded-md">
                        <h4 class="font-semibold text-gray-200">${d.title}</h4>
                        <p class="text-sm text-gray-400 mb-2">${d.company}</p>
                        <a href="${d.url}" target="_blank" class="text-sm font-medium text-cyan-400 hover:underline">View & Apply</a>
                    </div>
                `).join('');
                els.calendarModal.style.display = 'flex';
            }
        });
    });
}

// --- 14. GEMINI AI FUNCTIONS (REMOVED) ---
// All functions related to AI matching, handleSaveProfile, etc., are removed.

// --- 15. UTILITY FUNCTIONS ---

function showLoading(message) {
    els.loadingText.textContent = message;
    els.loadingIndicator.style.display = 'flex';
}

function hideLoading() {
    els.loadingIndicator.style.display = 'none';
}

// Custom modal alert to avoid native alert()
function showModalAlert(message) {
    // Check if an alert modal already exists, if not, create it
    let alertModal = document.getElementById('custom-alert-modal');
    if (!alertModal) {
        alertModal = document.createElement('div');
        alertModal.id = 'custom-alert-modal';
        alertModal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4';
        
        let alertBox = document.createElement('div');
        alertBox.className = 'bg-gray-800 w-full max-w-sm rounded-lg shadow-2xl p-6 relative border border-gray-700';
        
        let alertMessage = document.createElement('p');
        alertMessage.id = 'custom-alert-message';
        alertMessage.className = 'text-gray-200 mb-6';
        
        let closeButton = document.createElement('button');
        closeButton.id = 'custom-alert-close';
        closeButton.className = 'w-full bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors';
        closeButton.textContent = 'OK';
        
        closeButton.onclick = () => alertModal.style.display = 'none';
        
        alertBox.appendChild(alertMessage);
        alertBox.appendChild(closeButton);
        alertModal.appendChild(alertBox);
        document.body.appendChild(alertModal);
    }
    
    // Set message and show modal
    document.getElementById('custom-alert-message').textContent = message;
    alertModal.style.display = 'flex';
}

// Replace native confirm()
function showModalConfirm(message) {
    return new Promise((resolve) => {
        // Check if a confirm modal already exists, if not, create it
        let confirmModal = document.getElementById('custom-confirm-modal');
        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'custom-confirm-modal';
            confirmModal.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4';
            
            let confirmBox = document.createElement('div');
            confirmBox.className = 'bg-gray-800 w-full max-w-sm rounded-lg shadow-2xl p-6 relative border border-gray-700';
            
            let confirmMessage = document.createElement('p');
            confirmMessage.id = 'custom-confirm-message';
            confirmMessage.className = 'text-gray-200 mb-6';
            
            let buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'flex gap-4';

            let yesButton = document.createElement('button');
            yesButton.id = 'custom-confirm-yes';
            yesButton.className = 'w-full bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors';
            yesButton.textContent = 'Yes, Remove';
            
            let noButton = document.createElement('button');
            noButton.id = 'custom-confirm-no';
            noButton.className = 'w-full bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors';
            noButton.textContent = 'Cancel';

            yesButton.onclick = () => {
                confirmModal.style.display = 'none';
                resolve(true);
            };
            
            noButton.onclick = () => {
                confirmModal.style.display = 'none';
                resolve(false);
            };
            
            buttonWrapper.appendChild(noButton);
            buttonWrapper.appendChild(yesButton);
            confirmBox.appendChild(confirmMessage);
            confirmBox.appendChild(buttonWrapper);
            confirmModal.appendChild(confirmBox);
            document.body.appendChild(confirmModal);
        }
        
        // Set message and show modal
        document.getElementById('custom-confirm-message').textContent = message;
        confirmModal.style.display = 'flex';
    });
}

