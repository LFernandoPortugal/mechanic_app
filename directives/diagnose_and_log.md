# Directive: Vehicle Symptom Analysis & Job Logging

## Goal

Provide a preliminary diagnosis for vehicle symptoms and log the job for the mechanic's records.

## Inputs

- `customer_name`: Name of the customer.
- `vehicle_info`: Make, Model, and Year of the vehicle.
- `symptoms`: A description of what's wrong with the car.

## SOP (Standard Operating Procedure)

1.  **Analyze Symptoms**:
    - Use `execution/diagnose_ai.py` with the provided `symptoms`.
    - This script returns a likely cause and estimated repair difficulty.
2.  **Verify with Orchestration**:
    - As the Orchestrator, review the AI diagnosis. If it seems off, ask for clarification.
3.  **Log the Job**:
    - Use `execution/job_logger.py` to record:
      - Customer Name
      - Vehicle Info
      - Symptoms
      - Diagnosis
      - Date/Time
4.  **Notify Mechanic**:
    - Provide a summary of the logged job to the user.

## Tools

- `execution/diagnose_ai.py`
- `execution/job_logger.py`

## Edge Cases

- If symptoms are too vague (e.g., "it makes a noise"), the orchestrator must ask for more detail (where? when? what kind of noise?).
- If the vehicle info is missing, prompt the user.
