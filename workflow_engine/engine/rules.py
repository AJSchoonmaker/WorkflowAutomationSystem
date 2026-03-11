# rules.py


# Severity values for each event type
EVENT_VALUES = {
    "pothole": 3,
    "streetlight": 2,
    "damaged_sign": 2,
    "sidewalk_crack": 1,
    "water_leak": 4
}


# Borough priority weights
BOROUGH_WEIGHTS = {
    "Manhattan": 5,
    "Brooklyn": 4,
    "Queens": 3,
    "Bronx": 3,
    "Staten Island": 2
}


def should_escalate(complaint):
    """
    Determines if a complaint should be escalated.
    complaint is a tuple from database row
    """

    complaint_id = complaint[0]
    priority = complaint[2]
    status = complaint[6]

    if priority == "High" and status == "New":
        return True

    return False


def get_grid_weight(grid_location):
    """
    Example grid weight logic
    """

    # Example: central grids more important
    high_priority_cells = ["H10", "H11", "H12", "G10", "G11"]

    if grid_location in high_priority_cells:
        return 5

    return 3


def calculate_priority(event):
    """
    Calculates priority score and level for an event
    """

    event_value = EVENT_VALUES[event["event_type"]]
    borough_weight = BOROUGH_WEIGHTS[event["borough"]]
    grid_weight = get_grid_weight(event["grid_location"])

    score = event_value * (event["size"] + event["quantity"]) * borough_weight * grid_weight

    if score <= 50:
        level = "Low"
    elif score <= 150:
        level = "Medium"
    elif score <= 300:
        level = "High"
    else:
        level = "Critical"

    return score, level