document.addEventListener("DOMContentLoaded", function () {
    const map = L.map("map").setView([40.75, -73.98], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    const STORAGE_KEY = "nyc_infrastructure_complaints_v1";
    const ADMIN_SESSION_KEY = "nyc_admin_logged_in_v1";
    const ADMIN_PASSWORD = "admin123";

    let selectedCell = null;
    let currentMode = "priority";
    let gridVisible = true;
    let legend;
    let gridCells = [];
    let savedComplaints = [];
    let isAdmin = false;
    let activeSearchTerm = "";

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

            gridCells.forEach(cell => {
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

    function updateAdminUI() {
        const adminControls = document.getElementById("admin-controls");
        const lockedMessage = document.getElementById("admin-locked-message");
        const loginBtn = document.getElementById("admin-login-btn");
        const logoutBtn = document.getElementById("admin-logout-btn");
        const adminStatus = document.getElementById("admin-status");
        const passwordInput = document.getElementById("admin-password");

        if (isAdmin) {
            adminControls.classList.remove("hidden");
            lockedMessage.style.display = "none";
            loginBtn.style.display = "none";
            passwordInput.style.display = "none";
            logoutBtn.style.display = "block";
            adminStatus.textContent = "Admin mode enabled.";
        } else {
            adminControls.classList.add("hidden");
            lockedMessage.style.display = "block";
            loginBtn.style.display = "block";
            passwordInput.style.display = "block";
            logoutBtn.style.display = "none";
            adminStatus.textContent = "Admin controls are locked.";
        }

        renderComplaintList();
        renderSelectedZoneDetails();
        renderSearchResults();
    }

    function loginAdmin() {
        const passwordInput = document.getElementById("admin-password");
        const adminStatus = document.getElementById("admin-status");
        const enteredPassword = passwordInput.value;

        if (enteredPassword === ADMIN_PASSWORD) {
            isAdmin = true;
            sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
            passwordInput.value = "";
            updateAdminUI();
        } else {
            adminStatus.textContent = "Incorrect password.";
            passwordInput.value = "";
        }
    }

    function logoutAdmin() {
        isAdmin = false;
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        updateAdminUI();
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

    function getValuesForCurrentMode() {
        return gridCells.map(c =>
            currentMode === "complaints" ? c.complaints :
            currentMode === "busyness" ? c.busyScore :
            c.priority
        );
    }

    function getScaleMax() {
        const values = getValuesForCurrentMode();
        const actualMax = Math.max(...values, 1);

        if (currentMode === "complaints") {
            return Math.max(actualMax, 25);
        }
        if (currentMode === "busyness") {
            return Math.max(actualMax, 25);
        }
        return Math.max(actualMax, 500);
    }

    function getComplaintThresholds() {
        const values = gridCells.map(c => c.complaints);
        const actualMax = Math.max(...values, 5);

        const dynamicRange = actualMax - 5;
        const step = Math.ceil(dynamicRange / 4) || 1;

        return {
            noneMax: 0,
            minorMin: 1,
            minorMax: 4,
            lowMin: 5,
            lowMax: 5 + step - 1,
            moderateMin: 5 + step,
            moderateMax: 5 + (step * 2) - 1,
            highMin: 5 + (step * 2),
            highMax: 5 + (step * 3) - 1,
            veryHighMin: 5 + (step * 3),
            veryHighMax: actualMax
        };
    }

    function getColor(value) {
        if (currentMode === "complaints") {
            const t = getComplaintThresholds();

            if (value === 0) return "#d9d9d9";
            if (value <= t.minorMax) return "#2ecc71";
            if (value <= t.lowMax) return "#f1c40f";
            if (value <= t.moderateMax) return "#f39c12";
            if (value <= t.highMax) return "#e74c3c";
            return "#8e0000";
        }

        const scaleMax = getScaleMax();
        const step = scaleMax / 5;

        if (value > step * 4) return "#8e0000";
        if (value > step * 3) return "#e74c3c";
        if (value > step * 2) return "#f39c12";
        if (value > step * 1) return "#f1c40f";
        return "#2ecc71";
    }

    function calculateBusyness() {
        gridCells.forEach(c => {
            let lat = c.center[0];
            let lng = c.center[1];
            let score = 0;

            let midtownDist = Math.sqrt(
                Math.pow(lat - 40.758, 2) +
                Math.pow(lng + 73.985, 2)
            );
            score += Math.max(0, 15 - (midtownDist * 300));

            let downtownDist = Math.sqrt(
                Math.pow(lat - 40.7128, 2) +
                Math.pow(lng + 74.0060, 2)
            );
            score += Math.max(0, 12 - (downtownDist * 300));

            let westDist = Math.abs(lng + 74.01);
            score += Math.max(0, 8 - (westDist * 200));

            let eastDist = Math.abs(lng + 73.97);
            score += Math.max(0, 8 - (eastDist * 200));

            c.busyScore = score;

            if (score > 20) {
                c.locationWeight = 5;
                c.gridWeight = 5;
            } else if (score > 15) {
                c.locationWeight = 4;
                c.gridWeight = 4;
            } else if (score > 10) {
                c.locationWeight = 3;
                c.gridWeight = 3;
            } else if (score > 5) {
                c.locationWeight = 2;
                c.gridWeight = 2;
            } else {
                c.locationWeight = 1;
                c.gridWeight = 1;
            }
        });
    }

    function calculatePriority() {
        gridCells.forEach(c => {
            let total = 0;

            c.userComplaints.forEach(complaint => {
                complaint.score = calculateComplaintScore(complaint, c);
                total += complaint.score;
            });

            c.complaints = c.userComplaints.length;
            c.priority = total;
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

        if (!activeSearchTerm.trim()) {
            return matches;
        }

        gridCells.forEach(cell => {
            cell.userComplaints.forEach(complaint => {
                if (complaintMatchesSearch(cell, complaint, activeSearchTerm)) {
                    matches.push({
                        cell,
                        complaint
                    });
                }
            });
        });

        return matches;
    }

    function updateVisualization() {
        const searchMatches = getSearchMatches();
        const matchingCellIds = new Set(searchMatches.map(match => match.cell.id));

        gridCells.forEach(c => {
            let value =
                currentMode === "complaints" ? c.complaints :
                currentMode === "busyness" ? c.busyScore :
                c.priority;

            const isSearchMatch = activeSearchTerm.trim() && matchingCellIds.has(c.id);
            const isSelectedCell = selectedCell && selectedCell.id === c.id;

            c.rect.setStyle({
                fillColor: isSearchMatch ? "#2f80ed" : getColor(value),
                fillOpacity: gridVisible ? (isSearchMatch ? 0.85 : 0.6) : 0,
                color: isSelectedCell ? "#003cff" : (isSearchMatch ? "#0057c2" : "#333"),
                weight: isSelectedCell ? 3 : (isSearchMatch ? 2.5 : 0.5)
            });

            c.rect.bindTooltip(
                `Grid: ${c.id}<br>
                 Priority: ${c.priority}<br>
                 Complaints: ${c.complaints}<br>
                 Busyness: ${c.busyScore.toFixed(1)}<br>
                 Location Weight: ${c.locationWeight}<br>
                 Grid Weight: ${c.gridWeight}<br><br>
                 ${buildTypeCountHtml(c)}`
            );
        });
    }

    function refreshAll() {
        calculatePriority();
        updateVisualization();
        renderComplaintList();
        renderSelectedZoneDetails();
        renderSearchResults();
        if (legend) legend.update();
        saveComplaintsToStorage();
    }

    function clearAllComplaints() {
        if (!isAdmin) return;

        const firstCheck = confirm("Are you sure you want to clear all complaints?");
        if (!firstCheck) return;

        const secondCheck = confirm("This will permanently remove every saved complaint. Continue?");
        if (!secondCheck) return;

        gridCells.forEach(cell => {
            cell.userComplaints = [];
            cell.complaints = 0;
            cell.priority = 0;
        });

        localStorage.removeItem(STORAGE_KEY);
        refreshAll();

        const statusEl = document.getElementById("form-status");
        if (statusEl) {
            statusEl.textContent = "All complaints cleared.";
        }
    }

    function clearSelectedZone() {
        if (!isAdmin) return;

        const statusEl = document.getElementById("form-status");

        if (!selectedCell) {
            if (statusEl) {
                statusEl.textContent = "Please click a grid cell before clearing a zone.";
            }
            return;
        }

        const clearTypeSelect = document.getElementById("clear-zone-type");
        const selectedType = clearTypeSelect ? clearTypeSelect.value : "ALL";

        if (selectedCell.userComplaints.length === 0) {
            if (statusEl) {
                statusEl.textContent = selectedCell.id + " already has no complaints.";
            }
            return;
        }

        let matchingCount = selectedCell.userComplaints.length;

        if (selectedType !== "ALL") {
            matchingCount = selectedCell.userComplaints.filter(complaint =>
                complaint.category === selectedType
            ).length;
        }

        if (matchingCount === 0) {
            if (statusEl) {
                statusEl.textContent = "No " + selectedType + " complaints found in " + selectedCell.id + ".";
            }
            return;
        }

        const clearMessage = selectedType === "ALL"
            ? "Are you sure you want to clear all complaints from " + selectedCell.id + "?"
            : "Are you sure you want to clear all " + selectedType + " complaints from " + selectedCell.id + "?";

        const firstCheck = confirm(clearMessage);
        if (!firstCheck) return;

        const secondMessage = selectedType === "ALL"
            ? "This will permanently remove " + matchingCount + " complaint(s) from this zone. Continue?"
            : "This will permanently remove " + matchingCount + " " + selectedType + " complaint(s) from this zone. Continue?";

        const secondCheck = confirm(secondMessage);
        if (!secondCheck) return;

        if (selectedType === "ALL") {
            selectedCell.userComplaints = [];
        } else {
            selectedCell.userComplaints = selectedCell.userComplaints.filter(complaint =>
                complaint.category !== selectedType
            );
        }

        refreshAll();

        if (statusEl) {
            if (selectedType === "ALL") {
                statusEl.textContent = "Cleared " + matchingCount + " complaint(s) from " + selectedCell.id + ".";
            } else {
                statusEl.textContent = "Cleared " + matchingCount + " " + selectedType + " complaint(s) from " + selectedCell.id + ".";
            }
        }
    }

    function removeComplaintById(complaintId) {
        if (!isAdmin) return;

        let removed = false;

        gridCells.forEach(cell => {
            const originalLength = cell.userComplaints.length;
            cell.userComplaints = cell.userComplaints.filter(c => c.id !== complaintId);
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

    function runSearch() {
        const searchInput = document.getElementById("search-input");
        const searchValue = searchInput ? searchInput.value.trim() : "";

        activeSearchTerm = searchValue;

        updateVisualization();
        renderSearchResults();
    }

    function clearSearch() {
        const searchInput = document.getElementById("search-input");

        if (searchInput) {
            searchInput.value = "";
        }

        activeSearchTerm = "";

        updateVisualization();
        renderSearchResults();
    }

    function selectSearchResultCell(cellId) {
        const foundCell = gridCells.find(cell => cell.id === cellId);
        if (!foundCell) return;

        selectedCell = foundCell;

        const selectedCellInput = document.getElementById("selected-cell");
        const formStatus = document.getElementById("form-status");

        if (selectedCellInput) {
            selectedCellInput.value = foundCell.id;
        }

        if (formStatus && isAdmin) {
            formStatus.textContent = "Selected " + foundCell.id;
        }

        updateVisualization();

        map.flyTo(foundCell.center, 16, {
            duration: 1.2
        });

        setTimeout(function () {
            foundCell.rect.openTooltip();
        }, 700);

        renderComplaintList();
        renderSelectedZoneDetails();
    }

    function renderSearchResults() {
        const container = document.getElementById("search-results");
        if (!container) return;

        if (!activeSearchTerm.trim()) {
            container.className = "empty-text";
            container.innerHTML = "No search active.";
            return;
        }

        const matches = getSearchMatches();

        if (matches.length === 0) {
            container.className = "empty-text";
            container.innerHTML = "No matches found for \"" + activeSearchTerm + "\".";
            return;
        }

        container.className = "";
        container.innerHTML = `
            <div class="empty-text" style="margin-bottom:10px;">
                Found ${matches.length} result(s) for "${activeSearchTerm}".
            </div>
            ${matches.map(match => `
                <div class="search-result-item">
                    <strong>${match.complaint.category}</strong>
                    <div class="search-meta">
                        Grid: ${match.cell.id}<br>
                        Size: ${match.complaint.size}<br>
                        Quantity: ${match.complaint.quantity}<br>
                        Score: ${match.complaint.score}<br>
                        Submitted: ${formatTimestamp(match.complaint.submittedAt)}
                    </div>
                    <div class="search-description" style="margin-bottom:8px;">
                        ${match.complaint.description ? match.complaint.description : "No description provided."}
                    </div>
                    <button class="go-to-search-cell" data-cell-id="${match.cell.id}">
                        View This Zone
                    </button>
                </div>
            `).join("")}
        `;

        container.querySelectorAll(".go-to-search-cell").forEach(button => {
            button.addEventListener("click", function () {
                const cellId = this.getAttribute("data-cell-id");
                selectSearchResultCell(cellId);
            });
        });
    }

    function renderComplaintList() {
        const container = document.getElementById("complaint-items");
        const complaintListTitle = document.querySelector("#complaint-list h3");

        if (!container) return;

        if (complaintListTitle) {
            complaintListTitle.textContent = "Complaints in Selected Zone";
        }

        if (!selectedCell) {
            container.className = "empty-text";
            container.innerHTML = "Click a grid cell to show only the complaints in that zone.";
            return;
        }

        if (selectedCell.userComplaints.length === 0) {
            container.className = "empty-text";
            container.innerHTML = "No complaints found in " + selectedCell.id + ".";
            return;
        }

        container.className = "";
        container.innerHTML = selectedCell.userComplaints
            .slice()
            .reverse()
            .map(complaint => `
                <div class="complaint-item">
                    <strong>${complaint.category}</strong>
                    <div class="complaint-meta">
                        Grid: ${selectedCell.id}<br>
                        Size: ${complaint.size}<br>
                        Quantity: ${complaint.quantity}<br>
                        Score: ${complaint.score}<br>
                        Submitted: ${formatTimestamp(complaint.submittedAt)}
                    </div>
                    <div class="complaint-description" style="margin-bottom:8px;">
                        ${complaint.description ? complaint.description : "No description provided."}
                    </div>
                    ${isAdmin ? `
                        <button class="delete-complaint-btn remove-btn" data-id="${complaint.id}">
                            Remove
                        </button>
                    ` : ""}
                </div>
            `)
            .join("");

        if (isAdmin) {
            container.querySelectorAll(".delete-complaint-btn").forEach(button => {
                button.addEventListener("click", function () {
                    const complaintId = this.getAttribute("data-id");
                    removeComplaintById(complaintId);
                });
            });
        }
    }

    function renderSelectedZoneDetails() {
        const container = document.getElementById("zone-details-content");
        if (!container) return;

        if (!selectedCell) {
            container.className = "empty-text";
            container.innerHTML = "Click a grid cell to view all complaints in that zone.";
            return;
        }

        const typeCounts = getComplaintTypeCounts(selectedCell);
        const entries = Object.entries(typeCounts).filter(([, count]) => count > 0);

        let typeSummaryHtml = "No complaint types in this zone.";
        if (entries.length > 0) {
            typeSummaryHtml = entries
                .map(([type, count]) => `${type}: ${count}`)
                .join("<br>");
        }

        if (selectedCell.userComplaints.length === 0) {
            container.className = "";
            container.innerHTML = `
                <div class="zone-summary">
                    <strong>${selectedCell.id}</strong><br>
                    Total Complaints: 0<br>
                    Priority: ${selectedCell.priority}<br><br>
                    <strong>Type Breakdown</strong><br>
                    ${typeSummaryHtml}
                </div>
                <div class="empty-text">No complaints in this zone yet.</div>
            `;
            return;
        }

        container.className = "";
        container.innerHTML = `
            <div class="zone-summary">
                <strong>${selectedCell.id}</strong><br>
                Total Complaints: ${selectedCell.complaints}<br>
                Priority: ${selectedCell.priority}<br><br>
                <strong>Type Breakdown</strong><br>
                ${typeSummaryHtml}
            </div>
            ${selectedCell.userComplaints.map(complaint => `
                <div class="zone-complaint-item">
                    <strong>${complaint.category}</strong>
                    <div class="zone-meta">
                        Size: ${complaint.size}<br>
                        Quantity: ${complaint.quantity}<br>
                        Score: ${complaint.score}<br>
                        Submitted: ${formatTimestamp(complaint.submittedAt)}
                    </div>
                    <div class="zone-description">
                        ${complaint.description ? complaint.description : "No description provided."}
                    </div>
                </div>
            `).join("")}
        `;
    }

    function addControls() {
        const control = L.control({ position: "topright" });

        control.onAdd = function () {
            const div = L.DomUtil.create("div");

            div.innerHTML = `
                <div style="background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2);">
                    <strong>Layers</strong><br><br>
                    <button onclick="setMode('priority')">Priority</button><br>
                    <button onclick="setMode('complaints')">Complaints</button><br>
                    <button onclick="setMode('busyness')">Busyness</button><br><br>
                    <button onclick="toggleGrid()">Toggle Grid</button>
                </div>
            `;

            return div;
        };

        control.addTo(map);
    }

    function addLegend() {
        legend = L.control({ position: "bottomright" });

        legend.onAdd = function () {
            this._div = L.DomUtil.create("div");
            this.update();
            return this._div;
        };

        legend.update = function () {
            let title = "Priority Levels";

            if (currentMode === "complaints") {
                title = "Complaint Count";
                const t = getComplaintThresholds();

                const labels = [
                    { color: "#8e0000", text: `Very High (${t.veryHighMin}–${t.veryHighMax})` },
                    { color: "#e74c3c", text: `High (${t.highMin}–${t.highMax})` },
                    { color: "#f39c12", text: `Moderate (${t.moderateMin}–${t.moderateMax})` },
                    { color: "#f1c40f", text: `Low (${t.lowMin}–${t.lowMax})` },
                    { color: "#2ecc71", text: `Minor (${t.minorMin}–${t.minorMax})` },
                    { color: "#d9d9d9", text: "None (0)" }
                ];

                this._div.innerHTML = `
                    <div style="background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2);">
                        <strong>${title}</strong><br><br>
                        ${labels.map(l => `
                            <div>
                                <span style="background:${l.color};width:15px;height:15px;display:inline-block;margin-right:8px;border:1px solid #999;"></span>
                                ${l.text}
                            </div>
                        `).join("")}
                    </div>
                `;
                return;
            }

            if (currentMode === "busyness") {
                title = "Busyness Level";
            }

            const scaleMax = getScaleMax();
            const step = Math.ceil(scaleMax / 5);

            const labels = [
                { color: "#8e0000", text: `Very High (${step * 4 + 1}–${scaleMax})` },
                { color: "#e74c3c", text: `High (${step * 3 + 1}–${step * 4})` },
                { color: "#f39c12", text: `Moderate (${step * 2 + 1}–${step * 3})` },
                { color: "#f1c40f", text: `Low (${step + 1}–${step * 2})` },
                { color: "#2ecc71", text: `Minimal (0–${step})` }
            ];

            this._div.innerHTML = `
                <div style="background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2);">
                    <strong>${title}</strong><br><br>
                    ${labels.map(l => `
                        <div>
                            <span style="background:${l.color};width:15px;height:15px;display:inline-block;margin-right:8px;"></span>
                            ${l.text}
                        </div>
                    `).join("")}
                </div>
            `;
        };

        legend.addTo(map);
    }

    function applySavedComplaintsToGrid() {
        if (!savedComplaints.length) return;

        savedComplaints.forEach(savedComplaint => {
            const targetCell = gridCells.find(cell => cell.id === savedComplaint.cellId);
            if (!targetCell) return;

            targetCell.userComplaints.push({
                id: savedComplaint.id || String(Date.now() + Math.random()),
                category: savedComplaint.category || "Pothole",
                size: savedComplaint.size || 1,
                quantity: savedComplaint.quantity || 1,
                description: savedComplaint.description || "",
                submittedAt: savedComplaint.submittedAt || new Date().toISOString(),
                score: 0
            });
        });
    }

    fetch("Borough_Boundaries_20260318.geojson")
        .then(res => res.json())
        .then(data => {
            isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
            savedComplaints = loadSavedComplaints();

            const manhattanFeature = data.features.find(f =>
                Object.values(f.properties).some(v =>
                    String(v).toLowerCase().includes("manhattan")
                )
            );

            const manhattanLayer = L.geoJSON(manhattanFeature, {
                style: { color: "black", weight: 2, fillOpacity: 0 }
            }).addTo(map);

            map.fitBounds(manhattanLayer.getBounds());

            let coords = manhattanFeature.geometry.coordinates;
            let polygons = [];

            if (manhattanFeature.geometry.type === "MultiPolygon") {
                polygons = coords.map(p => p[0]);
            } else {
                polygons = [coords[0]];
            }

            function isInside(point, polygon) {
                let x = point[1];
                let y = point[0];
                let inside = false;

                for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                    let xi = polygon[i][0];
                    let yi = polygon[i][1];
                    let xj = polygon[j][0];
                    let yj = polygon[j][1];

                    let intersect =
                        ((yi > y) !== (yj > y)) &&
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

                    if (intersect) inside = !inside;
                }

                return inside;
            }

            function isInsideAnyPolygon(point) {
                return polygons.some(poly => isInside(point, poly));
            }

            function drawGrid() {
                let bounds = manhattanLayer.getBounds();
                let size = 0.004;
                let cellIndex = 1;

                for (let lat = bounds.getSouth(); lat < bounds.getNorth(); lat += size) {
                    for (let lng = bounds.getWest(); lng < bounds.getEast(); lng += size) {
                        let center = [lat + size / 2, lng + size / 2];

                        if (!isInsideAnyPolygon(center)) continue;

                        let rect = L.rectangle([
                            [lat, lng],
                            [lat + size, lng + size]
                        ], {
                            color: "#333",
                            weight: 0.5,
                            fillOpacity: 0.1
                        }).addTo(map);

                        let gridCell = {
                            id: "Cell-" + cellIndex,
                            center,
                            rect,
                            complaints: 0,
                            busyScore: 0,
                            priority: 0,
                            userComplaints: [],
                            locationWeight: 1,
                            gridWeight: 1
                        };

                        rect.on("click", function () {
                            selectedCell = gridCell;

                            const selectedCellInput = document.getElementById("selected-cell");
                            const formStatus = document.getElementById("form-status");

                            if (selectedCellInput) {
                                selectedCellInput.value = gridCell.id;
                            }

                            if (formStatus && isAdmin) {
                                formStatus.textContent = "Selected " + gridCell.id;
                            }

                            updateVisualization();
                            renderComplaintList();
                            renderSelectedZoneDetails();
                        });

                        gridCells.push(gridCell);
                        cellIndex++;
                    }
                }
            }

            window.setMode = function (mode) {
                currentMode = mode;
                updateVisualization();
                if (legend) legend.update();
            };

            window.toggleGrid = function () {
                gridVisible = !gridVisible;
                updateVisualization();
            };

            const submitButton = document.getElementById("submit-complaint");
            const clearAllButton = document.getElementById("clear-all-complaints");
            const clearSelectedZoneButton = document.getElementById("clear-selected-zone");
            const searchButton = document.getElementById("search-button");
            const clearSearchButton = document.getElementById("clear-search-button");
            const searchInput = document.getElementById("search-input");
            const loginBtn = document.getElementById("admin-login-btn");
            const logoutBtn = document.getElementById("admin-logout-btn");
            const passwordInput = document.getElementById("admin-password");

            if (loginBtn) {
                loginBtn.addEventListener("click", loginAdmin);
            }

            if (logoutBtn) {
                logoutBtn.addEventListener("click", logoutAdmin);
            }

            if (passwordInput) {
                passwordInput.addEventListener("keydown", function (event) {
                    if (event.key === "Enter") {
                        loginAdmin();
                    }
                });
            }

            if (clearAllButton) {
                clearAllButton.addEventListener("click", function () {
                    clearAllComplaints();
                });
            }

            if (clearSelectedZoneButton) {
                clearSelectedZoneButton.addEventListener("click", function () {
                    clearSelectedZone();
                });
            }

            if (searchButton) {
                searchButton.addEventListener("click", function () {
                    runSearch();
                });
            }

            if (clearSearchButton) {
                clearSearchButton.addEventListener("click", function () {
                    clearSearch();
                });
            }

            if (searchInput) {
                searchInput.addEventListener("keydown", function (event) {
                    if (event.key === "Enter") {
                        runSearch();
                    }
                });
            }

            if (submitButton) {
                submitButton.addEventListener("click", function () {
                    const statusEl = document.getElementById("form-status");

                    if (!isAdmin) {
                        if (statusEl) {
                            statusEl.textContent = "Admin access required.";
                        }
                        return;
                    }

                    if (!selectedCell) {
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
                        score: 0
                    };

                    selectedCell.userComplaints.push(complaint);

                    refreshAll();

                    if (statusEl) {
                        statusEl.textContent =
                            `Added ${category} to ${selectedCell.id}. New priority: ${selectedCell.priority}`;
                    }

                    document.getElementById("complaint-size").value = "1";
                    document.getElementById("complaint-count").value = "1";
                    document.getElementById("complaint-description").value = "";
                });
            }

            drawGrid();
            calculateBusyness();
            applySavedComplaintsToGrid();
            calculatePriority();
            updateVisualization();
            addControls();
            addLegend();
            updateAdminUI();
            renderComplaintList();
            renderSelectedZoneDetails();
            renderSearchResults();
        })
        .catch(error => {
            console.error("Error loading GeoJSON:", error);
        });
});