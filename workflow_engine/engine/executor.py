from database import update_complaint_status, insert_workflow_run

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