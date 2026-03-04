import sqlite3
from datetime import datetime
import uuid


DATABASE_NAME = "workflow.db"


def get_connection():
    """
    Creates and returns a connection to the SQLite database.
    If the database file does not exist, it will be created automatically.
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key enforcement
    return conn


def initialize_database():
    """
    Creates all required tables if they do not already exist.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Create complaints table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS complaints (
            complaint_id TEXT PRIMARY KEY,
            category TEXT CHECK(category IN ('Pothole','Noise','Trash')),
            priority TEXT CHECK(priority IN ('Low','Medium','High')),
            description TEXT,
            location TEXT,
            submitted_at TEXT,
            status TEXT CHECK(status IN ('New','In Progress','Resolved')),
            flagged INTEGER DEFAULT 0
        );
    """)

    # Create workflows table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            trigger_type TEXT CHECK(trigger_type IN ('EVENT','SCHEDULED')),
            active INTEGER DEFAULT 1,
            created_at TEXT
        );
    """)

    # Create workflow_runs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER,
            complaint_id TEXT,
            start_time TEXT,
            end_time TEXT,
            status TEXT CHECK(status IN ('RUNNING','SUCCESS','FAILED')),
            message TEXT,
            FOREIGN KEY (workflow_id) REFERENCES workflows(id),
            FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
        );
    """)

    conn.commit()
    conn.close()


def seed_workflow():
    """
    Inserts the initial workflow definition if it does not already exist.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM workflows WHERE name = 'High Priority Escalation';
    """)
    result = cursor.fetchone()

    if not result:
        cursor.execute("""
            INSERT INTO workflows (name, trigger_type, active, created_at)
            VALUES (?, ?, ?, ?);
        """, (
            "High Priority Escalation",
            "EVENT",
            1,
            datetime.now().isoformat()
        ))

    conn.commit()
    conn.close()

def insert_test_complaint():
    """
    Inserts a sample of High priority complaint for testing
    """
    conn = get_connection()
    cursor = conn.cursor()

    complaint_id = str(uuid.uuid4())

    cursor.execute("""
                    Insert into complaints(
                   complaint_id,
                   category,
                   priority,
                   description,
                   location,
                   submitted_at,
                   status,
                   flagged
                   )
                Values ( ?,?,?,?,?,?,?,?);
                   """,
                   (
                       complaint_id,
                       "Pothole",
                       "High",
                       "Large pothole in intersection",
                       "5th Ave and Main St",
                       datetime.now().isoformat(),
                       "New",
                       0  
                   ))
    
    conn.commit()
    conn.close()

    print(f"Inserted complaint {complaint_id}")

def fetch_new_complaints():
    """
    Retrieves complaints that are still in 'New' status
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
Select * FROM complaints WHERE status = 'New';
                   """
    )

    rows = cursor.fetchall()
    conn.close()

    return rows