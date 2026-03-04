from database import initialize_database, seed_workflow
from engine.engine import run_engine

def main():
    initialize_database()
    seed_workflow()

    run_engine()

if __name__ == "__main__":
    main()