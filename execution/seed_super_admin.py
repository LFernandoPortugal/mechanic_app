"""
seed_super_admin.py — Semilla la cuenta del creador con el rol SUPER_ADMIN en Firestore.

Uso:
  python execution/seed_super_admin.py --email email@ejemplo.com [--uid OPCIONAL_UID]

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
    from firebase_admin import credentials, firestore
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
        print("  Establece FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json")
        print("  O inicia sesión con: gcloud auth application-default login")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Seed SUPER_ADMIN user in Firestore.")
    parser.add_argument("--email", required=True, help="Email of the creator / SUPER_ADMIN")
    parser.add_argument("--uid", help="Optional UID if creating a new profile. If not provided, will update existing email.")
    args = parser.parse_args()

    email_clean = args.email.strip().lower()

    print("[INFO] Conectando a Firebase...")
    init_firebase()
    db = firestore.client()
    print("[OK] Conectado.\n")

    # If UID is provided, create/overwrite
    if args.uid:
        uid_clean = args.uid.strip()
        user_ref = db.collection("users").document(uid_clean)
        
        profile_data = {
            "uid": uid_clean,
            "email": email_clean,
            "displayName": email_clean.split("@")[0],
            "roles": ["SUPER_ADMIN"],
            "workshopId": "master-control",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP
        }
        
        user_ref.set(profile_data)
        print(f"[OK] Creado perfil SUPER_ADMIN para {email_clean} con UID: {uid_clean}")
        return

    # Otherwise search by email
    print(f"[INFO] Buscando usuario con email '{email_clean}'...")
    users_ref = db.collection("users")
    query = users_ref.where("email", "==", email_clean).limit(1)
    docs = list(query.stream())

    if not docs:
        print(f"[ERROR] No se encontró ningún perfil de usuario con el email '{email_clean}'.")
        print("💡 Sugerencia:")
        print("  1. Regístrate primero en la Web App con este correo para generar tu cuenta de Firebase Auth.")
        print("  2. Vuelve a ejecutar este script proporcionando el UID:")
        print(f"     python execution/seed_super_admin.py --email {email_clean} --uid EL_UID_DE_AUTH")
        sys.exit(1)

    user_doc = docs[0]
    print(f"[OK] Usuario encontrado. UID: {user_doc.id}")
    
    # Update role to SUPER_ADMIN
    user_doc.reference.update({
        "roles": ["SUPER_ADMIN"],
        "workshopId": "master-control",
        "updatedAt": firestore.SERVER_TIMESTAMP
    })
    
    print(f"[OK] El usuario '{email_clean}' ahora tiene el rol SUPER_ADMIN.")


if __name__ == "__main__":
    main()
