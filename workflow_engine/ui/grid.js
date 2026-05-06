function selectGridCell(gridCell) {

    AppState.selectedCell = gridCell;

    const selectedCellInput = document.getElementById("selected-cell");
    const formStatus = document.getElementById("form-status");

    if (selectedCellInput) {
        selectedCellInput.value = gridCell.id;
    }

    if (formStatus && AppState.isAdmin) {
        formStatus.textContent = "Selected " + gridCell.id;
    }

    updateVisualization();

    renderComplaintList();
    renderSelectedZoneDetails();
}

function zoomToGridCell(gridCell) {
    if (!gridCell || !gridCell.rect) return;

    const center = gridCell.center;

    AppState.map.flyTo(center, 15, {
        duration: 1.2
    });

    setTimeout(function () {
        gridCell.rect.openTooltip();
    }, 700);
}

function selectSearchResultCell(cellId) {

    const foundCell = AppState.gridCells.find(cell => cell.id === cellId);

    if (!foundCell) return;

    selectGridCell(foundCell);

    zoomToGridCell(foundCell);
}

function renderSearchResults() {

    const container = document.getElementById("search-results");

    if (!container) return;

    if (!AppState.activeSearchTerm.trim()) {
        container.className = "empty-text";
        container.innerHTML = "No search active.";
        return;
    }

    const matches = getSearchMatches();

    if (matches.length === 0) {
        container.className = "empty-text";
        container.innerHTML =
            `No matches found for "${AppState.activeSearchTerm}".`;

        return;
    }

    container.className = "";

    container.innerHTML = `
        <div class="empty-text" style="margin-bottom:10px;">
            Found ${matches.length} result(s) for
            "${AppState.activeSearchTerm}".
        </div>

        ${matches.map(match => `
            <div class="search-result-item">

                <strong>${match.complaint.category}</strong>

                <div class="search-meta">
                    Grid: ${match.cell.id}<br>
                    Size: ${match.complaint.size}<br>
                    Quantity: ${match.complaint.quantity}<br>
                    Score: ${match.complaint.score}<br>
                    Submitted:
                    ${formatTimestamp(match.complaint.submittedAt)}
                </div>

                <div class="search-description"
                     style="margin-bottom:8px;">

                    ${match.complaint.description
                        ? match.complaint.description
                        : "No description provided."}

                </div>

                <button
                    class="go-to-search-cell"
                    data-cell-id="${match.cell.id}"
                >
                    View This Zone
                </button>

            </div>
        `).join("")}
    `;

    container
        .querySelectorAll(".go-to-search-cell")
        .forEach(button => {

            button.addEventListener("click", function () {

                const cellId =
                    this.getAttribute("data-cell-id");

                selectSearchResultCell(cellId);
            });
        });
}

function getAllComplaintsSortedByPriority() {

    const allComplaints = [];

    AppState.gridCells.forEach(cell => {

        cell.userComplaints.forEach(complaint => {

            allComplaints.push({
                cell,
                complaint
            });
        });
    });

    return allComplaints.sort((a, b) => {
        const scoreA = Number(a.complaint.score) || 0;
        const scoreB = Number(b.complaint.score) || 0;

        return scoreB - scoreA;
    });
}

function renderComplaintList() {

    const container =
        document.getElementById("complaint-items");

    const complaintListTitle =
        document.querySelector("#complaint-list h3");

    if (!container) return;

    if (complaintListTitle) {
        complaintListTitle.textContent =
            "Priority Fix Queue";
    }

    const sortedComplaints = getAllComplaintsSortedByPriority();

    if (sortedComplaints.length === 0) {

        container.className = "empty-text";

        container.innerHTML =
            "No complaints submitted yet.";

        return;
    }

    container.className = "";

    container.innerHTML =
        sortedComplaints
        .map((item, index) => `

            <div class="complaint-item">

                <strong>
                    #${index + 1} ${item.complaint.category}
                </strong>

                <div class="complaint-meta">
                    Grid: ${item.cell.id}<br>
                    Priority Score: ${item.complaint.score}<br>
                    Size: ${item.complaint.size}<br>
                    Quantity: ${item.complaint.quantity}<br>
                    Submitted:
                    ${formatTimestamp(item.complaint.submittedAt)}
                </div>

                <div class="complaint-description"
                     style="margin-bottom:8px;">

                    ${item.complaint.description
                        ? item.complaint.description
                        : "No description provided."}

                </div>

                <button
                    class="go-to-priority-cell"
                    data-cell-id="${item.cell.id}"
                >
                    View Zone
                </button>

                ${AppState.isAdmin ? `
                    <button
                        class="delete-complaint-btn remove-btn"
                        data-id="${item.complaint.id}"
                    >
                        Remove
                    </button>
                ` : ""}

            </div>

        `).join("");

    container
        .querySelectorAll(".go-to-priority-cell")
        .forEach(button => {

            button.addEventListener("click", function () {

                const cellId =
                    this.getAttribute("data-cell-id");

                selectSearchResultCell(cellId);
            });
        });

    if (AppState.isAdmin) {

        container
            .querySelectorAll(".delete-complaint-btn")
            .forEach(button => {

                button.addEventListener("click", function () {

                    const complaintId =
                        this.getAttribute("data-id");

                    removeComplaintById(complaintId);
                });
            });
    }
}

function getTopProblemsForSelectedZone() {

    if (!AppState.selectedCell) return [];

    return AppState.selectedCell.userComplaints
        .slice()
        .sort((a, b) => {
            const scoreA = Number(a.score) || 0;
            const scoreB = Number(b.score) || 0;

            return scoreB - scoreA;
        })
        .slice(0, 5);
}

function renderSelectedZoneDetails() {

    const container =
        document.getElementById("zone-details-content");

    if (!container) return;

    if (!AppState.selectedCell) {

        container.className = "empty-text";

        container.innerHTML =
            "Click a grid cell to view what is wrong in that zone.";

        return;
    }

    const typeCounts =
        getComplaintTypeCounts(AppState.selectedCell);

    const topProblems = getTopProblemsForSelectedZone();

    const totalComplaints = AppState.selectedCell.complaints || 0;
    const priorityScore = AppState.selectedCell.priority || 0;

    const potholes = typeCounts.Pothole || 0;
    const streetlights = typeCounts.Streetlight || 0;
    const damagedSigns = typeCounts["Damaged Sign"] || 0;
    const sidewalks = typeCounts.Sidewalk || 0;
    const waterLeaks = typeCounts["Water Leak"] || 0;

    container.className = "";

    container.innerHTML = `
        <div class="zone-summary">

            <strong style="font-size:16px;">
                ${AppState.selectedCell.id}
            </strong>

            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
                margin-top:12px;
                margin-bottom:12px;
            ">

                <div style="
                    background:#eef2ff;
                    border:1px solid #c7d2fe;
                    border-radius:10px;
                    padding:10px;
                    text-align:center;
                ">
                    <div style="font-size:24px;font-weight:bold;">
                        ${totalComplaints}
                    </div>
                    <div style="font-size:12px;">
                        Total Issues
                    </div>
                </div>

                <div style="
                    background:#fff7ed;
                    border:1px solid #fed7aa;
                    border-radius:10px;
                    padding:10px;
                    text-align:center;
                ">
                    <div style="font-size:24px;font-weight:bold;">
                        ${priorityScore}
                    </div>
                    <div style="font-size:12px;">
                        Priority Score
                    </div>
                </div>

            </div>

            <strong>What is wrong in this zone</strong>

            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px;
                margin-top:10px;
            ">

                <div style="background:#f8fafc;border:1px solid #dce3ec;border-radius:8px;padding:8px;">
                    <strong style="font-size:20px;">${potholes}</strong><br>
                    <span style="font-size:12px;">Potholes</span>
                </div>

                <div style="background:#f8fafc;border:1px solid #dce3ec;border-radius:8px;padding:8px;">
                    <strong style="font-size:20px;">${streetlights}</strong><br>
                    <span style="font-size:12px;">Streetlights</span>
                </div>

                <div style="background:#f8fafc;border:1px solid #dce3ec;border-radius:8px;padding:8px;">
                    <strong style="font-size:20px;">${damagedSigns}</strong><br>
                    <span style="font-size:12px;">Damaged Signs</span>
                </div>

                <div style="background:#f8fafc;border:1px solid #dce3ec;border-radius:8px;padding:8px;">
                    <strong style="font-size:20px;">${sidewalks}</strong><br>
                    <span style="font-size:12px;">Sidewalks</span>
                </div>

                <div style="background:#f8fafc;border:1px solid #dce3ec;border-radius:8px;padding:8px;">
                    <strong style="font-size:20px;">${waterLeaks}</strong><br>
                    <span style="font-size:12px;">Water Leaks</span>
                </div>

            </div>

        </div>

        <div class="zone-summary">

            <strong>Top 5 Biggest Problems</strong>

            ${
                topProblems.length === 0
                    ? `<div class="empty-text" style="margin-top:8px;">No issues in this zone.</div>`
                    : topProblems.map((complaint, index) => `

                        <div class="zone-complaint-item" style="margin-top:10px;">

                            <strong>
                                #${index + 1} ${complaint.category}
                            </strong>

                            <div class="zone-meta">
                                Priority Score: ${complaint.score}<br>
                                Size: ${complaint.size}<br>
                                Quantity: ${complaint.quantity}<br>
                                Submitted:
                                ${formatTimestamp(complaint.submittedAt)}
                            </div>

                            <div class="zone-description">
                                ${complaint.description
                                    ? complaint.description
                                    : "No description provided."}
                            </div>

                        </div>

                    `).join("")
            }

        </div>
    `;
}

function drawGrid(manhattanLayer, polygons) {

    function isInside(point, polygon) {

        let x = point[1];
        let y = point[0];

        let inside = false;

        for (
            let i = 0, j = polygon.length - 1;
            i < polygon.length;
            j = i++
        ) {

            let xi = polygon[i][0];
            let yi = polygon[i][1];

            let xj = polygon[j][0];
            let yj = polygon[j][1];

            let intersect =
                ((yi > y) !== (yj > y)) &&
                (x <
                    (xj - xi) *
                    (y - yi) /
                    (yj - yi) +
                    xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }

    function isInsideAnyPolygon(point) {
        return polygons.some(poly =>
            isInside(point, poly)
        );
    }

    let bounds = manhattanLayer.getBounds();

    let size = 0.004;

    let cellIndex = 1;

    for (
        let lat = bounds.getSouth();
        lat < bounds.getNorth();
        lat += size
    ) {

        for (
            let lng = bounds.getWest();
            lng < bounds.getEast();
            lng += size
        ) {

            let center = [
                lat + size / 2,
                lng + size / 2
            ];

            if (!isInsideAnyPolygon(center)) continue;

            let rect = L.rectangle([
                [lat, lng],
                [lat + size, lng + size]
            ], {
                color: "#333",
                weight: 0.5,
                fillOpacity: 0.1
            }).addTo(AppState.map);

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
                selectGridCell(gridCell);
            });

            AppState.gridCells.push(gridCell);

            cellIndex++;
        }
    }
}