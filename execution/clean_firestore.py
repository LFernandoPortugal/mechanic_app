"""
clean_firestore.py — Limpieza de colecciones Firestore para inicio nuevo.

Borra todos los documentos de: jobs, inventory, inventory_transactions
Preserva: users, settings

Uso:
  python execution/clean_firestore.py [--dry-run] [--collections jobs inventory inventory_transactions]

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


def init_firebase():
    """Initialize Firebase Admin SDK."""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    # Try service account file
    sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_path and Path(sa_path).exists():
        cred = credentials.Certificate(sa_path)
        return firebase_admin.initialize_app(cred)

    # Try Application Default Credentials (gcloud auth)
    try:
        return firebase_admin.initialize_app()
    except Exception as e:
        print(f"❌ Could not initialize Firebase: {e}")
        print("  Set FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json")
        print("  Or run: gcloud auth application-default login")
        sys.exit(1)


def delete_collection(db, collection_name: str, dry_run: bool, batch_size: int = 100):
    """Delete all documents in a Firestore collection in batches."""
    coll_ref = db.collection(collection_name)
    total_deleted = 0

    while True:
        docs = list(coll_ref.limit(batch_size).stream())
        if not docs:
            break

        if dry_run:
            print(f"  [DRY RUN] Would delete {len(docs)} documents from '{collection_name}'")
            total_deleted += len(docs)
            break  # In dry run, just count and stop (don't paginate)
        else:
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
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        "--project",
        default="mechanic-app-7d459",
        help="Firebase project ID (used for logging)"
    )
    args = parser.parse_args()

    # Validate collections
    for col in args.collections:
        if col in PROTECTED:
            print(f"❌ '{col}' is a protected collection and cannot be deleted.")
            sys.exit(1)
        if col not in SAFE_TO_DELETE:
            print(f"⚠️  '{col}' is not in the known safe-to-delete list.")
            confirm = input(f"  Are you sure you want to delete '{col}'? (yes/no): ")
            if confirm.lower() != "yes":
                print("Aborted.")
                sys.exit(0)

    print(f"\n{'='*55}")
    print(f"  Firestore Cleanup — Project: {args.project}")
    print(f"  Mode: {'DRY RUN' if args.dry_run else '🔴 LIVE (IRREVERSIBLE)'}")
    print(f"  Collections: {', '.join(args.collections)}")
    print(f"{'='*55}\n")

    if not args.dry_run:
        confirm = input("⚠️  This will PERMANENTLY delete data. Type 'DELETE' to confirm: ")
        if confirm != "DELETE":
            print("Aborted.")
            sys.exit(0)

    # Initialize Firebase
    print("🔄 Connecting to Firebase...")
    init_firebase()
    db = firestore.client()
    print("✅ Connected.\n")

    # Delete collections
    results = {}
    for collection_name in args.collections:
        print(f"🗑️  Processing '{collection_name}'...")
        count = delete_collection(db, collection_name, args.dry_run)
        results[collection_name] = count

    # Summary
    print(f"\n{'='*55}")
    print("  Summary:")
    for col, count in results.items():
        action = "Would delete" if args.dry_run else "Deleted"
        print(f"  • {col}: {action} {count} documents")
    print(f"{'='*55}")
    print(f"\n✅ Done. {'(DRY RUN — no data was deleted)' if args.dry_run else 'Database is clean.'}")


if __name__ == "__main__":
    main()
