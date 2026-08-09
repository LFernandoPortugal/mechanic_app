"""
clean_firestore.py — Limpieza de colecciones Firestore para inicio nuevo.

Borra todos los documentos de: jobs, inventory, inventory_transactions
Preserva: users, settings

Uso seguro:
  python execution/clean_firestore.py --project mechanic-app-7d459
  python execution/clean_firestore.py --project mechanic-app-7d459 --apply
      [--collections jobs inventory inventory_transactions]

Requiere:
  pip install firebase-admin python-dotenv
  Service account JSON en FIREBASE_SERVICE_ACCOUNT_PATH (o GOOGLE_APPLICATION_CREDENTIALS)
"""

import argparse
import sys
import os
from pathlib import Path

# ─── Load .env ─────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# ─── Firebase Admin ─────────────────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)


SAFE_TO_DELETE = {"jobs", "inventory", "inventory_transactions"}
PROTECTED = {"users", "settings"}
EXPECTED_PROJECT_ID = "mechanic-app-7d459"


def init_firebase(project_id: str):
    """Initialize Firebase Admin SDK."""
    if firebase_admin._apps:
        app = firebase_admin.get_app()
        if app.project_id != project_id:
            raise RuntimeError(
                f"Firebase already initialized for '{app.project_id}', not '{project_id}'."
            )
        return app

    # Try service account file
    sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path and Path(sa_path).exists():
        cred = credentials.Certificate(sa_path)
        app = firebase_admin.initialize_app(cred, {"projectId": project_id})
        if app.project_id != project_id:
            raise RuntimeError(f"Unexpected Firebase project: {app.project_id}")
        return app

    # Try Application Default Credentials (gcloud auth)
    try:
        app = firebase_admin.initialize_app(options={"projectId": project_id})
        if app.project_id != project_id:
            raise RuntimeError(f"Unexpected Firebase project: {app.project_id}")
        return app
    except Exception as e:
        print(f"❌ Could not initialize Firebase: {e}")
        print("  Set FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json")
        print("  Or run: gcloud auth application-default login")
        sys.exit(1)


def delete_collection(db, collection_name: str, dry_run: bool, batch_size: int = 100):
    """Delete all documents in a Firestore collection in batches."""
    coll_ref = db.collection(collection_name)
    total_deleted = 0

    if dry_run:
        total_documents = sum(1 for _ in coll_ref.stream())
        print(f"  [DRY RUN] Would delete {total_documents} documents from '{collection_name}'")
        return total_documents

    while True:
        docs = list(coll_ref.limit(batch_size).stream())
        if not docs:
            break

        batch = db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        batch.commit()
        total_deleted += len(docs)
        print(f"  ✅ Deleted batch of {len(docs)} from '{collection_name}' (total so far: {total_deleted})")

    return total_deleted


def main():
    parser = argparse.ArgumentParser(description="Clean Firestore collections for a fresh start.")
    parser.add_argument(
        "--collections",
        nargs="+",
        default=list(SAFE_TO_DELETE),
        help=f"Collections to clean (default: {', '.join(SAFE_TO_DELETE)})"
    )
    parser.add_argument(
        "--project",
        required=True,
        help="Exact Firebase project ID"
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete data (default: dry run)"
    )
    args = parser.parse_args()
    dry_run = not args.apply

    if args.project != EXPECTED_PROJECT_ID:
        print(f"❌ Project rejected. This repository expects exactly '{EXPECTED_PROJECT_ID}'.")
        sys.exit(1)

    # Validate collections
    for col in args.collections:
        if col in PROTECTED:
            print(f"❌ '{col}' is a protected collection and cannot be deleted.")
            sys.exit(1)
        if col not in SAFE_TO_DELETE:
            print(f"❌ '{col}' is not in the repository's safe-to-delete list.")
            sys.exit(1)

    print(f"\n{'='*55}")
    print(f"  Firestore Cleanup — Project: {args.project}")
    print(f"  Mode: {'DRY RUN' if dry_run else '🔴 LIVE (IRREVERSIBLE)'}")
    print(f"  Collections: {', '.join(args.collections)}")
    print(f"{'='*55}\n")

    if not dry_run:
        expected_confirmation = f"DELETE {args.project}"
        confirm = input(
            f"⚠️  This will PERMANENTLY delete data. Type '{expected_confirmation}' to confirm: "
        )
        if confirm != expected_confirmation:
            print("Aborted.")
            sys.exit(0)

    # Initialize Firebase
    print("🔄 Connecting to Firebase...")
    init_firebase(args.project)
    db = firestore.client()
    print("✅ Connected.\n")

    # Delete collections
    results = {}
    for collection_name in args.collections:
        print(f"🗑️  Processing '{collection_name}'...")
        count = delete_collection(db, collection_name, dry_run)
        results[collection_name] = count

    # Summary
    print(f"\n{'='*55}")
    print("  Summary:")
    for col, count in results.items():
        action = "Would delete" if dry_run else "Deleted"
        print(f"  • {col}: {action} {count} documents")
    print(f"{'='*55}")
    print(f"\n✅ Done. {'(DRY RUN — no data was deleted)' if dry_run else 'Database is clean.'}")


if __name__ == "__main__":
    main()
