function getValuesForCurrentMode() {
    return AppState.gridCells.map(cell =>
        AppState.currentMode === "complaints" ? cell.complaints :
        AppState.currentMode === "busyness" ? cell.busyScore :
        cell.priority
    );
}

function getScaleMax() {
    const values = getValuesForCurrentMode();
    const actualMax = Math.max(...values, 1);

    if (AppState.currentMode === "complaints") {
        return Math.max(actualMax, 25);
    }

    if (AppState.currentMode === "busyness") {
        return Math.max(actualMax, 25);
    }

    return Math.max(actualMax, 500);
}

function getComplaintThresholds() {
    const values = AppState.gridCells.map(cell => cell.complaints);
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
    if (AppState.currentMode === "complaints") {
        const thresholds = getComplaintThresholds();

        if (value === 0) return "#d9d9d9";
        if (value <= thresholds.minorMax) return "#2ecc71";
        if (value <= thresholds.lowMax) return "#f1c40f";
        if (value <= thresholds.moderateMax) return "#f39c12";
        if (value <= thresholds.highMax) return "#e74c3c";

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
    AppState.gridCells.forEach(cell => {
        let lat = cell.center[0];
        let lng = cell.center[1];
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

        cell.busyScore = score;

        if (score > 20) {
            cell.locationWeight = 5;
            cell.gridWeight = 5;
        } else if (score > 15) {
            cell.locationWeight = 4;
            cell.gridWeight = 4;
        } else if (score > 10) {
            cell.locationWeight = 3;
            cell.gridWeight = 3;
        } else if (score > 5) {
            cell.locationWeight = 2;
            cell.gridWeight = 2;
        } else {
            cell.locationWeight = 1;
            cell.gridWeight = 1;
        }
    });
}

function updateVisualization() {
    const searchMatches = getSearchMatches();
    const matchingCellIds = new Set(searchMatches.map(match => match.cell.id));
    const searchTerm = AppState.activeSearchTerm.toLowerCase().trim();

    AppState.gridCells.forEach(cell => {
        let value =
            AppState.currentMode === "complaints" ? cell.complaints :
            AppState.currentMode === "busyness" ? cell.busyScore :
            cell.priority;

        const isDirectCellSearch =
            searchTerm &&
            cell.id.toLowerCase().includes(searchTerm);

        const isSearchMatch =
            searchTerm &&
            (matchingCellIds.has(cell.id) || isDirectCellSearch);

        const isSelectedCell =
            AppState.selectedCell &&
            AppState.selectedCell.id === cell.id;

        cell.rect.setStyle({
            fillColor: isSearchMatch ? "#2f80ed" : getColor(value),
            fillOpacity: AppState.gridVisible ? (isSearchMatch ? 0.85 : 0.6) : 0,
            color: isSelectedCell ? "#003cff" : (isSearchMatch ? "#0057c2" : "#333"),
            weight: isSelectedCell ? 3 : (isSearchMatch ? 2.5 : 0.5)
        });

        cell.rect.bindTooltip(
            `Grid: ${cell.id}<br>
             Priority: ${cell.priority}<br>
             Complaints: ${cell.complaints}<br>
             Busyness: ${cell.busyScore.toFixed(1)}<br>
             Location Weight: ${cell.locationWeight}<br>
             Grid Weight: ${cell.gridWeight}<br><br>
             ${buildTypeCountHtml(cell)}`
        );
    });
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

    control.addTo(AppState.map);
}

function addLegend() {
    AppState.legend = L.control({ position: "bottomright" });

    AppState.legend.onAdd = function () {
        this._div = L.DomUtil.create("div");
        this.update();
        return this._div;
    };

    AppState.legend.update = function () {
        let title = "Priority Levels";

        if (AppState.currentMode === "complaints") {
            title = "Complaint Count";
            const thresholds = getComplaintThresholds();

            const labels = [
                { color: "#8e0000", text: `Very High (${thresholds.veryHighMin}–${thresholds.veryHighMax})` },
                { color: "#e74c3c", text: `High (${thresholds.highMin}–${thresholds.highMax})` },
                { color: "#f39c12", text: `Moderate (${thresholds.moderateMin}–${thresholds.moderateMax})` },
                { color: "#f1c40f", text: `Low (${thresholds.lowMin}–${thresholds.lowMax})` },
                { color: "#2ecc71", text: `Minor (${thresholds.minorMin}–${thresholds.minorMax})` },
                { color: "#d9d9d9", text: "None (0)" }
            ];

            this._div.innerHTML = `
                <div style="background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2);">
                    <strong>${title}</strong><br><br>
                    ${labels.map(label => `
                        <div>
                            <span style="background:${label.color};width:15px;height:15px;display:inline-block;margin-right:8px;border:1px solid #999;"></span>
                            ${label.text}
                        </div>
                    `).join("")}
                </div>
            `;
            return;
        }

        if (AppState.currentMode === "busyness") {
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
                ${labels.map(label => `
                    <div>
                        <span style="background:${label.color};width:15px;height:15px;display:inline-block;margin-right:8px;"></span>
                        ${label.text}
                    </div>
                `).join("")}
            </div>
        `;
    };

    AppState.legend.addTo(AppState.map);
}

function setMode(mode) {
    AppState.currentMode = mode;

    updateVisualization();

    if (AppState.legend) {
        AppState.legend.update();
    }
}

function toggleGrid() {
    AppState.gridVisible = !AppState.gridVisible;
    updateVisualization();
}
window.setMode = setMode;
window.toggleGrid = toggleGrid;