document.addEventListener("DOMContentLoaded", function () {

    const map = L.map('map').setView([40.75, -73.98], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    fetch("Borough_Boundaries_20260318.geojson")
    .then(res => res.json())
    .then(data => {

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
            let x = point[1], y = point[0];
            let inside = false;

            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                let xi = polygon[i][0], yi = polygon[i][1];
                let xj = polygon[j][0], yj = polygon[j][1];

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

        let gridCells = [];
        let currentMode = "priority";
        let gridVisible = true;
        let legend;

        function drawGrid() {
            let bounds = manhattanLayer.getBounds();
            let size = 0.004;

            for (let lat = bounds.getSouth(); lat < bounds.getNorth(); lat += size) {
                for (let lng = bounds.getWest(); lng < bounds.getEast(); lng += size) {

                    let center = [lat + size/2, lng + size/2];

                    if (!isInsideAnyPolygon(center)) continue;

                    let rect = L.rectangle([
                        [lat, lng],
                        [lat + size, lng + size]
                    ], {
                        color: "#333",
                        weight: 0.5,
                        fillOpacity: 0.1
                    }).addTo(map);

                    gridCells.push({
                        center,
                        rect,
                        complaints: 0,
                        busyScore: 0,
                        priority: 0
                    });
                }
            }
        }

        function simulateComplaints() {
            gridCells.forEach(c => {
                c.complaints = Math.floor(Math.random() * 20);
            });
        }

        // FIXED BUSYNESS MODEL
        function calculateBusyness() {
            gridCells.forEach(c => {

                let lat = c.center[0];
                let lng = c.center[1];

                let score = 0;

                // Midtown hotspot
                let midtownDist = Math.sqrt(
                    Math.pow(lat - 40.758, 2) +
                    Math.pow(lng + 73.985, 2)
                );
                score += Math.max(0, 15 - (midtownDist * 300));

                // Downtown hotspot
                let downtownDist = Math.sqrt(
                    Math.pow(lat - 40.7128, 2) +
                    Math.pow(lng + 74.0060, 2)
                );
                score += Math.max(0, 12 - (downtownDist * 300));

                // West Side Highway
                let westDist = Math.abs(lng + 74.01);
                score += Math.max(0, 8 - (westDist * 200));

                // FDR Drive
                let eastDist = Math.abs(lng + 73.97);
                score += Math.max(0, 8 - (eastDist * 200));

                c.busyScore = score;
            });
        }

        function calculatePriority() {
            gridCells.forEach(c => {
                c.priority = (c.complaints * 2) + (c.busyScore * 3);
            });
        }

        function getColor(value) {
            if (value > 60) return "#8e0000";
            if (value > 45) return "#e74c3c";
            if (value > 30) return "#f39c12";
            if (value > 15) return "#f1c40f";
            return "#2ecc71";
        }

        function updateVisualization() {
            gridCells.forEach(c => {

                let value =
                    currentMode === "complaints" ? c.complaints :
                    currentMode === "busyness" ? c.busyScore :
                    c.priority;

                c.rect.setStyle({
                    fillColor: getColor(value),
                    fillOpacity: gridVisible ? 0.6 : 0
                });

                c.rect.bindTooltip(
                    `Priority: ${c.priority}<br>
                     Complaints: ${c.complaints}<br>
                     Busyness: ${c.busyScore.toFixed(1)}`
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
                if (currentMode === "complaints") title = "Complaint Density";
                if (currentMode === "busyness") title = "Busyness Level";

                this._div.innerHTML = `
                    <div style="background:white;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2);">
                        <strong>${title}</strong><br><br>
                        <div><span style="background:#8e0000;width:15px;height:15px;display:inline-block;margin-right:8px;"></span> Very High</div>
                        <div><span style="background:#e74c3c;width:15px;height:15px;display:inline-block;margin-right:8px;"></span> High</div>
                        <div><span style="background:#f39c12;width:15px;height:15px;display:inline-block;margin-right:8px;"></span> Moderate</div>
                        <div><span style="background:#f1c40f;width:15px;height:15px;display:inline-block;margin-right:8px;"></span> Low</div>
                        <div><span style="background:#2ecc71;width:15px;height:15px;display:inline-block;margin-right:8px;"></span> Minimal</div>
                    </div>
                `;
            };

            legend.addTo(map);
        }

        window.setMode = function(mode) {
            currentMode = mode;
            updateVisualization();
            if (legend) legend.update();
        };

        window.toggleGrid = function() {
            gridVisible = !gridVisible;
            updateVisualization();
        };

        drawGrid();
        simulateComplaints();
        calculateBusyness();
        calculatePriority();
        updateVisualization();
        addControls();
        addLegend();

    });

});