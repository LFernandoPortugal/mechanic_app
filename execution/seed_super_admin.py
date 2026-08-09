"""
seed_super_admin.py — Semilla la cuenta del creador con el rol SUPER_ADMIN en Firestore.

Uso seguro:
  python execution/seed_super_admin.py --project mechanic-app-7d459 --email email@ejemplo.com
  python execution/seed_super_admin.py --project mechanic-app-7d459 --email email@ejemplo.com --apply

Requisitos:
  pip install firebase-admin python-dotenv
"""

import argparse
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
    from firebase_admin import auth, credentials, firestore
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
        print("  Establece FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json")
        print("  O inicia sesión con: gcloud auth application-default login")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Seed SUPER_ADMIN user in Firestore.")
    parser.add_argument("--project", required=True, help="Exact Firebase project ID")
    parser.add_argument("--email", required=True, help="Email of the creator / SUPER_ADMIN")
    parser.add_argument("--uid", help="Optional Firebase Auth UID; its email must match --email")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the role change (default: preview only)",
    )
    args = parser.parse_args()

    email_clean = args.email.strip().lower()
    if args.project != EXPECTED_PROJECT_ID:
        print(
            f"[ERROR] Proyecto rechazado. Este repositorio espera exactamente '{EXPECTED_PROJECT_ID}'."
        )
        sys.exit(1)

    if not args.apply:
        print(f"[DRY RUN] Se validaría y provisionaría un único SUPER_ADMIN en {args.project}.")
        print("[DRY RUN] No se conectó a Firebase y no se modificó ningún dato.")
        return

    confirmation = input(f"Escribe 'GRANT SUPER_ADMIN IN {args.project}' para continuar: ")
    if confirmation != f"GRANT SUPER_ADMIN IN {args.project}":
        print("Operación cancelada.")
        return

    print("[INFO] Conectando a Firebase...")
    init_firebase(args.project)
    db = firestore.client()
    print("[OK] Conectado.\n")

    try:
        auth_user = auth.get_user(args.uid.strip()) if args.uid else auth.get_user_by_email(email_clean)
    except auth.UserNotFoundError:
        print("[ERROR] La cuenta no existe en Firebase Authentication.")
        sys.exit(1)

    if auth_user.email is None or auth_user.email.strip().lower() != email_clean:
        print("[ERROR] El UID de Firebase Auth no corresponde al email indicado.")
        sys.exit(1)

    existing_super_admins = list(
        db.collection("users").where("roles", "array_contains", "SUPER_ADMIN").stream()
    )
    conflicting = [doc for doc in existing_super_admins if doc.id != auth_user.uid]
    if conflicting:
        print("[ERROR] Ya existe otra cuenta SUPER_ADMIN. No se creó una segunda.")
        sys.exit(1)

    user_ref = db.collection("users").document(auth_user.uid)
    snapshot = user_ref.get()
    payload = {
        "uid": auth_user.uid,
        "email": email_clean,
        "displayName": auth_user.display_name or email_clean.split("@")[0],
        "roles": ["SUPER_ADMIN"],
        "workshopId": "master-control",
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if not snapshot.exists:
        payload["createdAt"] = firestore.SERVER_TIMESTAMP
    user_ref.set(payload, merge=True)

    print(f"[OK] El usuario '{email_clean}' ahora tiene el rol SUPER_ADMIN.")


if __name__ == "__main__":
    main()
