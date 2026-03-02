from database import (
    initialize_database,
    seed_workflow,
    insert_test_complaint,
    fetch_new_complaints
)
def main():
    initialize_database()
    seed_workflow()

    #Insert a test complaint
    insert_test_complaint()

    #Fetch complaints
    complaints = fetch_new_complaints()

    print("New complaints")
    for complaint in complaints:
        print(complaint)

if __name__ == "__main__":
    main()