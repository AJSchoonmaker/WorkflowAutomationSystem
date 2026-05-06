from database import initialize_database, seed_workflow
from engine.engine import run_engine

def main():
    initialize_database()
    seed_workflow()

    run_engine()

if __name__ == "__main__":
    main()

from engine.executor import process_event

event = {
    "event_id": 1,
    "event_type": "pothole",
    "block_number": "245 W 42nd St",
    "borough": "Manhattan",
    "grid_location": "H11",
    "size": 4,
    "quantity": 2,
    "reported_by": "Kia"
}


processed = process_event(event)