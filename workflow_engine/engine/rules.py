def should_escalate(complaint):
    """
    Determines if a complaint should be escalated.
    complaint is a tuple from database row
    """

    complaint_id = complaint[0]
    priority = complaint [2]
    status = complaint[6]

    if priority == "High" and status == "New":
        return True
    
    return False