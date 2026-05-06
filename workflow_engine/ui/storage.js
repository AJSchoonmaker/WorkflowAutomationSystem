const STORAGE_KEY = "nyc_infrastructure_complaints_v1";
const ADMIN_SESSION_KEY = "nyc_admin_logged_in_v1";
const ADMIN_PASSWORD = "admin123";

const AppState = {
    map: null,
    selectedCell: null,
    currentMode: "priority",
    gridVisible: true,
    legend: null,
    gridCells: [],
    savedComplaints: [],
    isAdmin: false,
    activeSearchTerm: ""
};

function loadSavedComplaints() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Error loading saved complaints:", error);
        return [];
    }
}

function saveComplaintsToStorage() {
    try {
        const allComplaints = [];

        AppState.gridCells.forEach(cell => {
            cell.userComplaints.forEach(complaint => {
                allComplaints.push({
                    ...complaint,
                    cellId: cell.id
                });
            });
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(allComplaints));
    } catch (error) {
        console.error("Error saving complaints:", error);
    }
}

function clearComplaintStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

function loadAdminSession() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function saveAdminSession() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
}

function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
}