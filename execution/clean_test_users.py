"""
clean_test_users.py — Remueve cuentas de prueba antiguas e inicializa las nuevas cuentas demo aisladas.

Uso:
  python execution/clean_test_users.py

Requisitos:
  pip install firebase-admin python-dotenv
"""

import sys
import os
from pathlib import Path

# Load env variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
except ImportError:
    print("[ERROR] firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)


def init_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path and Path(sa_path).exists():
        cred = credentials.Certificate(sa_path)
        return firebase_admin.initialize_app(cred)

    try:
        return firebase_admin.initialize_app()
    except Exception as e:
        print(f"[ERROR] Error al inicializar Firebase: {e}")
        sys.exit(1)


EMAILS_TO_DELETE = [
    "admin@demo.com",
    "demo-admin@demo.com",
    "tech@demo.com",
    "reception@demo.com",
    "advisor@demo.com"
]

DEMO_ACCOUNTS = [
    {
        "email": "demo-admin@demo.com",
        "roles": ["ADMIN", "RECEPTION", "TECHNICIAN", "ADVISOR"],
        "workshopId": "demo-workshop",
        "displayName": "Demo Admin"
    },
    {
        "email": "tech@demo.com",
        "roles": ["TECHNICIAN"],
        "workshopId": "demo-workshop",
        "displayName": "Demo Técnico"
    },
    {
        "email": "reception@demo.com",
        "roles": ["RECEPTION"],
        "workshopId": "demo-workshop",
        "displayName": "Demo Recepción"
    },
    {
        "email": "advisor@demo.com",
        "roles": ["ADVISOR", "RECEPTION"],
        "workshopId": "demo-workshop",
        "displayName": "Demo Asesor"
    }
]


def delete_user(email):
    # 1. Delete from Auth
    uid = None
    try:
        user = auth.get_user_by_email(email)
        uid = user.uid
        auth.delete_user(uid)
        print(f"  [OK] Eliminado de Firebase Auth: {email} ({uid})")
    except auth.UserNotFoundError:
        print(f"  [INFO] No encontrado en Firebase Auth: {email}")
    except Exception as e:
        print(f"  [ERROR] Error al eliminar {email} de Auth: {e}")

    return uid


def main():
    print("[INFO] Conectando a Firebase...")
    init_firebase()
    db = firestore.client()
    print("[OK] Conectado.\n")

    print("[INFO] Fase 1: Eliminando cuentas de prueba antiguas...")
    # Delete from Auth and Firestore
    for email in EMAILS_TO_DELETE:
        uid = delete_user(email)
        
        # Search by email in Firestore in case UID differed or user doc is orphaned
        users_ref = db.collection("users")
        query = users_ref.where("email", "==", email)
        for doc in query.stream():
            doc.reference.delete()
            print(f"  [OK] Documento Firestore borrado: {email} ({doc.id})")
        
        if uid:
            db.collection("users").document(uid).delete()

    print("\n[INFO] Fase 2: Sembrando nuevas cuentas demo limpias (Password: password123)...")
    for acc in DEMO_ACCOUNTS:
        email = acc["email"]
        try:
            # Create in Auth
            user = auth.create_user(
                email=email,
                password="password123",
                display_name=acc["displayName"]
            )
            print(f"  [OK] Creado en Auth: {email} (UID: {user.uid})")

            # Create in Firestore
            profile_data = {
                "uid": user.uid,
                "email": email,
                "displayName": acc["displayName"],
                "roles": acc["roles"],
                "workshopId": acc["workshopId"],
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            db.collection("users").document(user.uid).set(profile_data)
            print(f"  [OK] Sembrado en Firestore 'users': {email}")
        except Exception as e:
            print(f"  [ERROR] Error al sembrar {email}: {e}")

    # Initialize demo-workshop settings if they don't exist
    settings_ref = db.collection("settings").document("demo-workshop")
    if not settings_ref.get().exists:
        settings_ref.set({
            "workshopName": "SGA Demo Workshop",
            "logoUrl": "",
            "address": "Av. Principal 123, Auto City",
            "phone": "+51 900 123 456",
            "taxId": "20123456789",
            "termsAndConditions": "Al firmar, el cliente autoriza los diagnósticos y reparaciones presupuestadas.",
            "demoMode": True,
            "currencySymbol": "S/.",
            "taxRate": 18.0,
            "taxName": "IGV",
            "allowResetData": True  # Enable reset for testing demo
        })
        print("  [OK] Creada configuración para 'demo-workshop'")

    print("\n[OK] Listo. Las cuentas demo heredadas han sido removidas y re-sembradas de forma segura.")


if __name__ == "__main__":
    main()
