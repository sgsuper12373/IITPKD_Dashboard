#!/usr/bin/env python3
import os
import requests
import argparse
import logging
import time
from pathlib import Path
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:5000/api"
CSV_DIR = Path(__file__).parent / "test_csv_files"
LOG_FILE = Path(__file__).parent / "upload_test_report.log"

# Ordered list of tables to handle foreign key dependencies
# Based on the implementation plan
UPLOAD_ORDER = [
    "department",
    "courses_table",
    "student_table",
    "alumni",
    "employees",
    "externship_info",
    "faculty_engagement",
    "igrs_yearwise",
    "icc_yearwise",
    "ewd_yearwise",
    "nirf_ranking",
    "icsr_sponsered_projects",
    "icsr_consultancy_projects",
    "icsr_csr",
    "research_mous",
    "research_patents",
    "research_publications",
    "placement_summary",
    "placement_companies",
    "placement_packages",
    "innovation_projects",
    "iptif_startup_table",
    "iptif_program_table",
    "iptif_projects_table",
    "iptif_facilities_table",
    "techin_startup_table",
    "techin_program_table",
    "techin_skill_development_program",
    "industry_events",
    "industry_conclave",
    "open_house",
    "outreach",
    "nptel_courses",
    "uba_projects",
    "uba_events"
]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def get_token(email, password):
    """Logs in and returns the JWT token."""
    login_url = f"{BASE_URL}/auth/login"
    try:
        response = requests.post(login_url, json={"email": email, "password": password})
        if response.status_code == 200:
            return response.json().get("token")
        else:
            logging.error("Login failed: %s", response.json().get("message", "Unknown error"))
            return None
    except Exception as e:
        logging.error("Error during login: %s", e)
        return None

def upload_csv(table_name, file_path, token):
    """Uploads a single CSV file to the upload endpoint."""
    upload_url = f"{BASE_URL}/upload-csv"
    headers = {"Authorization": f"Bearer {token}"}
    data = {"table_name": table_name}
    
    try:
        with open(file_path, 'rb') as f:
            files = {'csv_file': (file_path.name, f, 'text/csv')}
            response = requests.post(upload_url, headers=headers, data=data, files=files)
            
            if response.status_code == 200:
                result = response.json()
                return True, f"200: {result.get('message', 'Success')}"
            else:
                try:
                    error_msg = response.json().get('message', 'Unknown error')
                except:
                    error_msg = response.text
                return False, f"{response.status_code}: {error_msg}"
    except Exception as e:
        return False, f"Exception: {str(e)}"

def run_tests(token):
    """Iterates through the CSV files in order and uploads them."""
    stats = {"pass": 0, "fail": 0, "skip": 0}
    
    with open(LOG_FILE, "a") as log:
        log.write(f"\n=== Upload Test Run — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n\n")

    # Get list of all CSV files in directory
    all_csv_files = {f.stem: f for f in CSV_DIR.glob("*.csv")}
    
    # Process files in specified order
    processed_tables = []
    for table_name in UPLOAD_ORDER:
        if table_name in all_csv_files:
            file_path = all_csv_files[table_name]
            logging.info("Uploading %s...", table_name)
            success, message = upload_csv(table_name, file_path, token)
            
            status = "PASS" if success else "FAIL"
            log_entry = f"[{status}] {table_name:<30} → {message}"
            logging.info(log_entry)
            
            with open(LOG_FILE, "a") as log:
                log.write(log_entry + "\n")
            
            if success:
                stats["pass"] += 1
            else:
                stats["fail"] += 1
            
            processed_tables.append(table_name)
    
    # Check for CSV files not in UPLOAD_ORDER
    for table_name, file_path in all_csv_files.items():
        if table_name not in UPLOAD_ORDER:
            log_entry = f"[SKIP] {table_name:<30} → Not in UPLOAD_ORDER"
            logging.info(log_entry)
            with open(LOG_FILE, "a") as log:
                log.write(log_entry + "\n")
            stats["skip"] += 1

    # Print Summary
    summary = (
        f"\n--- Summary ---\n"
        f"Passed:  {stats['pass']}\n"
        f"Failed:  {stats['fail']}\n"
        f"Skipped: {stats['skip']}\n"
        f"Total:   {stats['pass'] + stats['fail'] + stats['skip']}\n"
    )
    logging.info(summary)
    with open(LOG_FILE, "a") as log:
        log.write(summary)

def main():
    parser = argparse.ArgumentParser(description="Upload Integration Test Script")
    parser.add_argument("--email", help="Admin email for login")
    parser.add_argument("--password", help="Admin password for login")
    args = parser.parse_args()

    email = args.email or os.environ.get("TEST_EMAIL")
    password = args.password or os.environ.get("TEST_PASSWORD")

    if not email or not password:
        logging.error("Email and password are required. Use --email/--password or set TEST_EMAIL/TEST_PASSWORD environment variables.")
        return

    logging.info("Targeting backend at %s", BASE_URL)
    token = get_token(email, password)
    if not token:
        return

    run_tests(token)

if __name__ == "__main__":
    main()
