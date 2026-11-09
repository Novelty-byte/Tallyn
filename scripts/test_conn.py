import os
import sys

try:
    import psycopg2  # type: ignore
except ImportError:
    print("psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not key:
    print("Set SUPABASE_SERVICE_ROLE_KEY in your environment (never hard-code it).")
    sys.exit(1)

host = os.environ.get("SUPABASE_DB_HOST", "db.negclsyrkflhurfjhtan.supabase.co")

print(f"Connecting to {host} with key from environment...")

try:
    conn = psycopg2.connect(
        host=host,
        port=5432,
        database="postgres",
        user="postgres",
        password=key,
        connect_timeout=10,
        sslmode="require",
    )
    cur = conn.cursor()
    cur.execute("SELECT current_database(), version();")
    row = cur.fetchone()
    print(f"SUCCESS: connected to {row[0]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
