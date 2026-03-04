from database import fetch_new_complaints
from engine.rules import should_escalate
from engine.executor import execute_escalation


def run_engine():
    """
    Main workflow engine loop
    """

    complaints = fetch_new_complaints()

    print("Processing complaints... \n")

    for complaint in complaints:
        if should_escalate(complaint):
            execute_escalation(complaint)

    print("\nEngine run complete.")
