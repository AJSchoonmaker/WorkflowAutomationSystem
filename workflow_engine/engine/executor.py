from engine.rules import calculate_priority
from database.event_repository import insert_event
from database import update_complaint_status, insert_workflow_run


def process_event(event):
    """
    Processes a new event and stores it in the database
    """

    score, level = calculate_priority(event)

    event["priority_score"] = score
    event["priority_level"] = level

    print("Event processed:")
    print("Priority Score:", score)
    print("Priority Level:", level)

    insert_event(event)

    return event


def execute_escalation(complaint):
    """
    Executes escalation workflow for a complaint
    """

    complaint_id = complaint[0]

    print(f"Escalating complaint {complaint_id}")

    update_complaint_status(complaint_id, "In Progress")

    insert_workflow_run(
        workflow_id=1,
        complaint_id=complaint_id,
        status="SUCCESS",
        message="Auto-escalated high priority complaint"
    )