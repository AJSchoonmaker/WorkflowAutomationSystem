function formatTimestamp(timestamp) {
    if (!timestamp) return "Unknown Date";

    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
        return "Unknown Date";
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function getCategoryWeight(category) {
    switch (category) {
        case "Pothole":
            return 5;
        case "Water Leak":
            return 5;
        case "Streetlight":
            return 4;
        case "Sidewalk":
            return 4;
        case "Damaged Sign":
            return 3;
        default:
            return 1;
    }
}

function calculateComplaintScore(complaint, cell) {
    const typeWeight = getCategoryWeight(complaint.category);
    const size = Number(complaint.size);
    const quantity = Number(complaint.quantity);
    const locationWeight = cell.locationWeight || 1;
    const gridWeight = cell.gridWeight || 1;

    return typeWeight * (size + quantity) * locationWeight * gridWeight;
}

function calculatePriority() {
    AppState.gridCells.forEach(cell => {
        let total = 0;

        cell.userComplaints.forEach(complaint => {
            complaint.score = calculateComplaintScore(complaint, cell);
            total += complaint.score;
        });

        cell.complaints = cell.userComplaints.length;
        cell.priority = total;
    });
}

function getComplaintTypeCounts(cell) {
    const counts = {
        Pothole: 0,
        Streetlight: 0,
        "Damaged Sign": 0,
        Sidewalk: 0,
        "Water Leak": 0
    };

    cell.userComplaints.forEach(complaint => {
        if (counts.hasOwnProperty(complaint.category)) {
            counts[complaint.category] += 1;
        } else {
            counts[complaint.category] = 1;
        }
    });

    return counts;
}

function buildTypeCountHtml(cell) {
    const counts = getComplaintTypeCounts(cell);
    const entries = Object.entries(counts).filter(([, count]) => count > 0);

    if (entries.length === 0) {
        return "Types: None";
    }

    return "Types:<br>" + entries
        .map(([type, count]) => `${type}: ${count}`)
        .join("<br>");
}

function refreshAll() {
    calculatePriority();

    if (typeof updateVisualization === "function") {
        updateVisualization();
    }

    if (typeof renderComplaintList === "function") {
        renderComplaintList();
    }

    if (typeof renderSelectedZoneDetails === "function") {
        renderSelectedZoneDetails();
    }

    if (typeof renderSearchResults === "function") {
        renderSearchResults();
    }

    if (AppState.legend) {
        AppState.legend.update();
    }

    saveComplaintsToStorage();
}

function clearAllComplaints() {
    if (!AppState.isAdmin) return;

    const firstCheck = confirm("Are you sure you want to clear all complaints?");
    if (!firstCheck) return;

    const secondCheck = confirm("This will permanently remove every saved complaint. Continue?");
    if (!secondCheck) return;

    AppState.gridCells.forEach(cell => {
        cell.userComplaints = [];
        cell.complaints = 0;
        cell.priority = 0;
    });

    clearComplaintStorage();
    refreshAll();

    const demoToggle = document.getElementById("demo-mode-toggle");
    const demoStatus = document.getElementById("demo-mode-status");

    if (demoToggle) {
        demoToggle.checked = false;
    }

    if (demoStatus) {
        demoStatus.textContent = "Demo Mode Disabled";
    }

    const statusEl = document.getElementById("form-status");
    if (statusEl) {
        statusEl.textContent = "All complaints cleared.";
    }
}

function clearSelectedZone() {
    if (!AppState.isAdmin) return;

    const statusEl = document.getElementById("form-status");

    if (!AppState.selectedCell) {
        if (statusEl) {
            statusEl.textContent = "Please click a grid cell before clearing a zone.";
        }
        return;
    }

    const clearTypeSelect = document.getElementById("clear-zone-type");
    const selectedType = clearTypeSelect ? clearTypeSelect.value : "ALL";

    if (AppState.selectedCell.userComplaints.length === 0) {
        if (statusEl) {
            statusEl.textContent = AppState.selectedCell.id + " already has no complaints.";
        }
        return;
    }

    let matchingCount = AppState.selectedCell.userComplaints.length;

    if (selectedType !== "ALL") {
        matchingCount = AppState.selectedCell.userComplaints.filter(complaint =>
            complaint.category === selectedType
        ).length;
    }

    if (matchingCount === 0) {
        if (statusEl) {
            statusEl.textContent = "No " + selectedType + " complaints found in " + AppState.selectedCell.id + ".";
        }
        return;
    }

    const clearMessage = selectedType === "ALL"
        ? "Are you sure you want to clear all complaints from " + AppState.selectedCell.id + "?"
        : "Are you sure you want to clear all " + selectedType + " complaints from " + AppState.selectedCell.id + "?";

    const firstCheck = confirm(clearMessage);
    if (!firstCheck) return;

    const secondMessage = selectedType === "ALL"
        ? "This will permanently remove " + matchingCount + " complaint(s) from this zone. Continue?"
        : "This will permanently remove " + matchingCount + " " + selectedType + " complaint(s) from this zone. Continue?";

    const secondCheck = confirm(secondMessage);
    if (!secondCheck) return;

    if (selectedType === "ALL") {
        AppState.selectedCell.userComplaints = [];
    } else {
        AppState.selectedCell.userComplaints = AppState.selectedCell.userComplaints.filter(complaint =>
            complaint.category !== selectedType
        );
    }

    refreshAll();

    if (statusEl) {
        if (selectedType === "ALL") {
            statusEl.textContent = "Cleared " + matchingCount + " complaint(s) from " + AppState.selectedCell.id + ".";
        } else {
            statusEl.textContent = "Cleared " + matchingCount + " " + selectedType + " complaint(s) from " + AppState.selectedCell.id + ".";
        }
    }
}

function removeComplaintById(complaintId) {
    if (!AppState.isAdmin) return;

    let removed = false;

    AppState.gridCells.forEach(cell => {
        const originalLength = cell.userComplaints.length;

        cell.userComplaints = cell.userComplaints.filter(complaint =>
            complaint.id !== complaintId
        );

        if (cell.userComplaints.length !== originalLength) {
            removed = true;
        }
    });

    if (removed) {
        refreshAll();

        const statusEl = document.getElementById("form-status");
        if (statusEl) {
            statusEl.textContent = "Complaint removed.";
        }
    }
}

function complaintMatchesSearch(cell, complaint, searchTerm) {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    if (!normalizedSearch) {
        return false;
    }

    const category = String(complaint.category || "").toLowerCase();
    const description = String(complaint.description || "").toLowerCase();
    const cellId = String(cell.id || "").toLowerCase();
    const size = String(complaint.size || "").toLowerCase();
    const quantity = String(complaint.quantity || "").toLowerCase();
    const score = String(complaint.score || "").toLowerCase();
    const submitted = formatTimestamp(complaint.submittedAt).toLowerCase();

    return (
        category.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        cellId.includes(normalizedSearch) ||
        size.includes(normalizedSearch) ||
        quantity.includes(normalizedSearch) ||
        score.includes(normalizedSearch) ||
        submitted.includes(normalizedSearch)
    );
}

function getSearchMatches() {
    const matches = [];

    if (!AppState.activeSearchTerm.trim()) {
        return matches;
    }

    AppState.gridCells.forEach(cell => {
        cell.userComplaints.forEach(complaint => {
            if (complaintMatchesSearch(cell, complaint, AppState.activeSearchTerm)) {
                matches.push({
                    cell,
                    complaint
                });
            }
        });
    });

    return matches;
}

function runSearch() {
    const searchInput = document.getElementById("search-input");
    const searchValue = searchInput ? searchInput.value.trim() : "";

    AppState.activeSearchTerm = searchValue;

    if (typeof updateVisualization === "function") {
        updateVisualization();
    }

    if (typeof renderSearchResults === "function") {
        renderSearchResults();
    }
}

function clearSearch() {
    const searchInput = document.getElementById("search-input");

    if (searchInput) {
        searchInput.value = "";
    }

    AppState.activeSearchTerm = "";

    if (typeof updateVisualization === "function") {
        updateVisualization();
    }

    if (typeof renderSearchResults === "function") {
        renderSearchResults();
    }
}

function addComplaintToSelectedCell() {
    const statusEl = document.getElementById("form-status");

    if (!AppState.isAdmin) {
        if (statusEl) {
            statusEl.textContent = "Admin access required.";
        }
        return;
    }

    if (!AppState.selectedCell) {
        if (statusEl) {
            statusEl.textContent = "Please click a grid cell first.";
        }
        return;
    }

    const category = document.getElementById("complaint-category").value;
    const size = document.getElementById("complaint-size").value;
    const quantity = document.getElementById("complaint-count").value;
    const description = document.getElementById("complaint-description").value.trim();

    const complaint = {
        id: String(Date.now() + Math.random()),
        category,
        size,
        quantity,
        description,
        submittedAt: new Date().toISOString(),
        isDemo: false,
        score: 0
    };

    AppState.selectedCell.userComplaints.push(complaint);

    refreshAll();

    if (statusEl) {
        statusEl.textContent =
            `Added ${category} to ${AppState.selectedCell.id}. New priority: ${AppState.selectedCell.priority}`;
    }

    document.getElementById("complaint-size").value = "1";
    document.getElementById("complaint-count").value = "1";
    document.getElementById("complaint-description").value = "";
}

function getRandomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPastTimestamp() {
    const now = new Date();
    const randomHoursBack = getRandomNumber(1, 240);
    now.setHours(now.getHours() - randomHoursBack);
    return now.toISOString();
}

function createDemoComplaint() {
    const categories = [
        "Pothole",
        "Streetlight",
        "Damaged Sign",
        "Sidewalk",
        "Water Leak"
    ];

    const notes = {
        Pothole: [
            "Large pothole reported near an intersection.",
            "Multiple potholes causing slow traffic.",
            "Deep road damage reported by nearby residents."
        ],
        Streetlight: [
            "Streetlight out near crosswalk.",
            "Poor visibility reported at night.",
            "Light flickering and needs inspection."
        ],
        "Damaged Sign": [
            "Traffic sign bent and hard to read.",
            "Missing sign reported near corner.",
            "Damaged sign creating confusion for drivers."
        ],
        Sidewalk: [
            "Cracked sidewalk creating tripping hazard.",
            "Uneven pavement reported by pedestrians.",
            "Sidewalk damage near building entrance."
        ],
        "Water Leak": [
            "Water pooling near curb.",
            "Possible underground leak reported.",
            "Standing water affecting pedestrian path."
        ]
    };

    const category = getRandomItem(categories);

    return {
        id: "demo-" + String(Date.now() + Math.random()),
        category,
        size: String(getRandomNumber(1, 5)),
        quantity: String(getRandomNumber(1, 5)),
        description: getRandomItem(notes[category]),
        submittedAt: getRandomPastTimestamp(),
        isDemo: true,
        score: 0
    };
}

function generateDemoData() {
    const statusEl = document.getElementById("form-status");
    const demoStatus = document.getElementById("demo-mode-status");

    if (AppState.gridCells.length === 0) {
        if (statusEl) {
            statusEl.textContent = "Grid is not loaded yet. Try again in a moment.";
        }
        return;
    }

    clearDemoData(false);

    const numberOfCellsToUse = Math.min(250, AppState.gridCells.length);
    const usedIndexes = new Set();

    while (usedIndexes.size < numberOfCellsToUse) {
        usedIndexes.add(getRandomNumber(0, AppState.gridCells.length - 1));
    }

    usedIndexes.forEach(index => {
        const cell = AppState.gridCells[index];
        const complaintsForCell = getRandomNumber(3, 25);

        for (let i = 0; i < complaintsForCell; i++) {
            cell.userComplaints.push(createDemoComplaint());
        }
    });

    refreshAll();

    if (demoStatus) {
        demoStatus.textContent = "Demo Mode Active";
    }

    if (statusEl) {
        statusEl.textContent = "Demo data generated across the map.";
    }
}

function clearDemoData(shouldRefresh = true) {
    AppState.gridCells.forEach(cell => {
        cell.userComplaints = cell.userComplaints.filter(complaint =>
            !complaint.isDemo
        );
    });

    if (shouldRefresh) {
        refreshAll();

        const statusEl = document.getElementById("form-status");
        const demoStatus = document.getElementById("demo-mode-status");

        if (demoStatus) {
            demoStatus.textContent = "Demo Mode Disabled";
        }

        if (statusEl) {
            statusEl.textContent = "Demo data cleared. Manual complaints were kept.";
        }
    }
}

function toggleDemoMode() {
    if (!AppState.isAdmin) {
        const demoToggle = document.getElementById("demo-mode-toggle");
        const statusEl = document.getElementById("form-status");

        if (demoToggle) {
            demoToggle.checked = false;
        }

        if (statusEl) {
            statusEl.textContent = "Admin access required for demo mode.";
        }

        return;
    }

    const demoToggle = document.getElementById("demo-mode-toggle");

    if (demoToggle && demoToggle.checked) {
        generateDemoData();
    } else {
        clearDemoData(true);
    }
}

function applySavedComplaintsToGrid() {
    if (!AppState.savedComplaints.length) return;

    AppState.savedComplaints.forEach(savedComplaint => {
        const targetCell = AppState.gridCells.find(cell =>
            cell.id === savedComplaint.cellId
        );

        if (!targetCell) return;

        targetCell.userComplaints.push({
            id: savedComplaint.id || String(Date.now() + Math.random()),
            category: savedComplaint.category || "Pothole",
            size: savedComplaint.size || 1,
            quantity: savedComplaint.quantity || 1,
            description: savedComplaint.description || "",
            submittedAt: savedComplaint.submittedAt || new Date().toISOString(),
            isDemo: Boolean(savedComplaint.isDemo),
            score: 0
        });
    });
}

function setupComplaintListeners() {
    const submitButton = document.getElementById("submit-complaint");
    const clearAllButton = document.getElementById("clear-all-complaints");
    const clearSelectedZoneButton = document.getElementById("clear-selected-zone");
    const searchButton = document.getElementById("search-button");
    const clearSearchButton = document.getElementById("clear-search-button");
    const searchInput = document.getElementById("search-input");
    const demoToggle = document.getElementById("demo-mode-toggle");

    if (submitButton) {
        submitButton.addEventListener("click", addComplaintToSelectedCell);
    }

    if (clearAllButton) {
        clearAllButton.addEventListener("click", clearAllComplaints);
    }

    if (clearSelectedZoneButton) {
        clearSelectedZoneButton.addEventListener("click", clearSelectedZone);
    }

    if (searchButton) {
        searchButton.addEventListener("click", runSearch);
    }

    if (clearSearchButton) {
        clearSearchButton.addEventListener("click", clearSearch);
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                runSearch();
            }
        });
    }

    if (demoToggle) {
        demoToggle.addEventListener("change", toggleDemoMode);
    }
}