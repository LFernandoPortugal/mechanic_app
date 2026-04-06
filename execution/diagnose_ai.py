import sys
import json

def diagnose_symptoms(symptoms):
    """
    Simulates an AI diagnosis based on symptoms.
    In a real scenario, this might call an LLM API.
    """
    symptoms_lower = symptoms.lower()
    
    if "squeak" in symptoms_lower and "brake" in symptoms_lower:
        return {
            "diagnosis": "Worn brake pads or warped rotors.",
            "difficulty": "Medium",
            "estimated_time": "1-2 hours"
        }
    elif "misfire" in symptoms_lower or "stutter" in symptoms_lower:
        return {
            "diagnosis": "Faulty spark plugs or ignition coils.",
            "difficulty": "Medium",
            "estimated_time": "2-3 hours"
        }
    elif "leak" in symptoms_lower and "oil" in symptoms_lower:
        return {
            "diagnosis": "Leaking oil pan gasket or valve cover gasket.",
            "difficulty": "High",
            "estimated_time": "4-6 hours"
        }
    elif "battery" in symptoms_lower or "start" in symptoms_lower:
        return {
            "diagnosis": "Dead battery or failing alternator.",
            "difficulty": "Low",
            "estimated_time": "0.5-1 hour"
        }
    else:
        return {
            "diagnosis": "Generic engine/chassis issue. Further inspection required.",
            "difficulty": "Unknown",
            "estimated_time": "TBD"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symptoms provided"}))
        sys.exit(1)
        
    symptoms_input = " ".join(sys.argv[1:])
    result = diagnose_symptoms(symptoms_input)
    print(json.dumps(result))
