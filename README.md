# Workflow Automation and Orchestration System

## Project Overview
This project implements a rule-based workflow automation system that processes NYC 311 service request data. Each complaint is treated as an independent event that triggers a defined workflow consisting of validation, classification (processed or failed), database storage, and execution logging.

The system simulates real-world backend automation by ingesting structured event data, applying deterministic rules, and exposing system state through a monitoring interface.

## Motivation
Many operational systems rely on recurring data-processing tasks such as validation, record tracking, and status reporting. These processes are often manual or loosely structured. This project explores how such tasks can be automated through a centralized workflow engine that ensures consistent execution, traceability, and reliability.

The project emphasizes backend system design, database integration, and workflow orchestration rather than predictive analytics or frontend-heavy development.

## Core Features
- Event-driven workflow execution for each NYC 311 complaint
-Deterministic validation rules (required field checks)
-Classification of records as PROCESSED or FAILED
-SQL-backed storage of complaint data and execution logs
-Scheduled time-based triggers for automated processing
-Interactive monitoring interface for viewing, filtering, and flagging complaints
-Controlled user-submission form that feeds into the same workflow pipeline

## Example Workflows
1. Dataset Ingestion Workflow
When an NYC 311 CSV file is loaded:
Each row is treated as a workflow instance.
Required fields are validated.
Valid records are stored in the database as PROCESSED.
Invalid records are marked FAILED and logged with error details.
2. Scheduled Aging Check
On a daily trigger:
The system identifies complaints that remain open beyond a defined time threshold.
Matching records are flagged for review.
Results are logged.
3. User-Submitted Complaint Workflow
When a user submits a complaint through the form:
Input is validated using the same rules as dataset records.
The complaint enters the same processing pipeline.
Execution status is recorded in the database.

## Technology Stack
- **Backend:** Python  
- **Database:** SQLite (local SQL storage)  
- **Version Control:** Git / GitHub  
- **Environment:** Local development
The system is designed for local execution and testing.

## System Architecture (High-Level)
1. Complaint data is ingested (CSV input or user submission).
2. The workflow engine validates required fields.
3. Records are classified as PROCESSED or FAILED.
4. Results are stored in the SQL database.
5. Execution logs are recorded.
6. The monitoring interface reads from the database to display system state.
The interface is read-only for existing records and does not alter workflow logic.
## Project Status
The core workflow engine, validation logic, and database schema are currently under implementation. The monitoring interface and scheduled triggers are being integrated in parallel.

## Future Enhancements
-Expanded dataset compatibility beyond NYC 311
-Additional filtering and reporting views
-Improved scheduling configuration
-Enhanced error reporting structure
-Optional lightweight web-based dashboard

## Course Information
**Course:** CPS 485 – Senior Projects  
**Semester:** Spring 2026  

## Author
Anthony Schoonmaker
