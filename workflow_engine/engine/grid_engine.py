# engine/grid_engine.py


BOROUGH_BOUNDS = {

    "Manhattan": {
        "lat_min": 40.700,
        "lat_max": 40.880,
        "lon_min": -74.020,
        "lon_max": -73.910
    },

    "Brooklyn": {
        "lat_min": 40.570,
        "lat_max": 40.740,      
        "lon_min": -74.050,
        "lon_max": -73.850
    },

    "Queens": {
        "lat_min": 40.540,
        "lat_max": 40.800,
        "lon_min": -73.960,
        "lon_max": -73.700
    },

    "Bronx": {
        "lat_min": 40.790,
        "lat_max": 40.920,
        "lon_min": -73.930,
        "lon_max": -73.760
    },

    "Staten Island": {
        "lat_min": 40.490,
        "lat_max": 40.650,
        "lon_min": -74.260,
        "lon_max": -74.050
    }
}


def get_grid_cell(borough, latitude, longitude):
    """
    Calculates the 20x20 grid cell based on coordinates
    """

    bounds = BOROUGH_BOUNDS[borough]

    lat_range = bounds["lat_max"] - bounds["lat_min"]
    lon_range = bounds["lon_max"] - bounds["lon_min"]

    lat_step = lat_range / 20
    lon_step = lon_range / 20

    row = int((latitude - bounds["lat_min"]) / lat_step)
    col = int((longitude - bounds["lon_min"]) / lon_step)

    row = max(0, min(row, 19))
    col = max(0, min(col, 19))

    row_letter = chr(ord("A") + row)

    grid_cell = f"{row_letter}{col+1}"

    return grid_cell