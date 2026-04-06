import sys
import json
import os
from datetime import datetime

JOBS_FILE = os.path.join(os.path.dirname(__file__), "..", "jobs.json")

def log_job(customer, vehicle, symptoms, diagnosis):
    job_entry = {
        "timestamp": datetime.now().isoformat(),
        "customer": customer,
        "vehicle": vehicle,
        "symptoms": symptoms,
        "diagnosis": diagnosis
    }
    
    jobs = []
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, "r") as f:
                jobs = json.load(f)
        except json.JSONDecodeError:
            jobs = []
            
    jobs.append(job_entry)
    
    with open(JOBS_FILE, "w") as f:
        json.dump(jobs, f, indent=4)
        
    return job_entry

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Missing arguments. Usage: job_logger.py <customer> <vehicle> <symptoms> <diagnosis>"}))
        sys.exit(1)
        
    customer = sys.argv[1]
    vehicle = sys.argv[2]
    symptoms = sys.argv[3]
    diagnosis = sys.argv[4]
    
    result = log_job(customer, vehicle, symptoms, diagnosis)
    print(json.dumps({"status": "success", "job": result}))
