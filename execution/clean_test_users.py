"""
clean_test_users.py — Remueve cuentas de prueba antiguas e inicializa las nuevas cuentas demo aisladas.

Uso seguro:
  # Vista previa (no conecta ni modifica datos)
  python execution/clean_test_users.py --project mechanic-app-7d459

  # Ejecución explícita; la contraseña se toma del entorno y nunca del código
  set DEMO_ACCOUNT_PASSWORD=<contraseña-fuerte>
  python execution/clean_test_users.py --project mechanic-app-7d459 --apply

Requisitos:
  pip install firebase-admin python-dotenv
"""

import argparse
import os
import sys
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


EXPECTED_PROJECT_ID = "mechanic-app-7d459"


def init_firebase(project_id):
    if firebase_admin._apps:
        app = firebase_admin.get_app()
        if app.project_id != project_id:
            raise RuntimeError(
                f"Firebase ya está inicializado para '{app.project_id}', no para '{project_id}'."
            )
        return app

    sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path and Path(sa_path).exists():
        cred = credentials.Certificate(sa_path)
        app = firebase_admin.initialize_app(cred, {"projectId": project_id})
        if app.project_id != project_id:
            raise RuntimeError(f"Proyecto Firebase inesperado: {app.project_id}")
        return app

    try:
        app = firebase_admin.initialize_app(options={"projectId": project_id})
        if app.project_id != project_id:
            raise RuntimeError(f"Proyecto Firebase inesperado: {app.project_id}")
        return app
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
    parser = argparse.ArgumentParser(
        description="Recreate isolated demo users with explicit safeguards."
    )
    parser.add_argument("--project", required=True, help="Exact Firebase project ID")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the destructive delete/recreate operation (default: preview only)",
    )
    args = parser.parse_args()

    if args.project != EXPECTED_PROJECT_ID:
        print(
            f"[ERROR] Proyecto rechazado. Este repositorio espera exactamente '{EXPECTED_PROJECT_ID}'."
        )
        sys.exit(1)

    if not args.apply:
        print(f"[DRY RUN] Proyecto: {args.project}")
        print("[DRY RUN] Se eliminarían y recrearían las cuentas demo declaradas en el script.")
        print("[DRY RUN] No se conectó a Firebase y no se modificó ningún dato.")
        return

    demo_password = os.environ.get("DEMO_ACCOUNT_PASSWORD", "")
    if len(demo_password) < 12:
        print("[ERROR] DEMO_ACCOUNT_PASSWORD debe tener al menos 12 caracteres.")
        sys.exit(1)

    confirmation = input(
        f"Escribe 'RECREATE DEMO USERS IN {args.project}' para continuar: "
    )
    if confirmation != f"RECREATE DEMO USERS IN {args.project}":
        print("Operación cancelada.")
        return

    print("[INFO] Conectando a Firebase...")
    init_firebase(args.project)
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

    print("\n[INFO] Fase 2: Sembrando nuevas cuentas demo con una contraseña externa...")
    for acc in DEMO_ACCOUNTS:
        email = acc["email"]
        try:
            # Create in Auth
            user = auth.create_user(
                email=email,
                password=demo_password,
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
