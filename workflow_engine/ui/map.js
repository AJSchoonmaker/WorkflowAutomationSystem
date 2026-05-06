document.addEventListener("DOMContentLoaded", function () {
    AppState.map = L.map("map", {
        maxZoom: 16,
        maxBounds: [
            [40.66, -74.08],
            [40.92, -73.88]
        ],
        maxBoundsViscosity: 1.0
    }).setView([40.75, -73.98], 13);

    setTimeout(() => {
        AppState.map.invalidateSize();
    }, 100);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(AppState.map);

    AppState.isAdmin = loadAdminSession();
    AppState.savedComplaints = loadSavedComplaints();

    setupAdminListeners();
    setupComplaintListeners();

    fetch("Borough_Boundaries_20260318.geojson")
        .then(response => response.json())
        .then(data => {
            const manhattanFeature = data.features.find(feature =>
                Object.values(feature.properties).some(value =>
                    String(value).toLowerCase().includes("manhattan")
                )
            );

            const manhattanLayer = L.geoJSON(manhattanFeature, {
                style: {
                    color: "black",
                    weight: 2,
                    fillOpacity: 0
                }
            }).addTo(AppState.map);

            AppState.map.fitBounds(manhattanLayer.getBounds());

            let coords = manhattanFeature.geometry.coordinates;
            let polygons = [];

            if (manhattanFeature.geometry.type === "MultiPolygon") {
                polygons = coords.map(polygon => polygon[0]);
            } else {
                polygons = [coords[0]];
            }

            drawGrid(manhattanLayer, polygons);

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