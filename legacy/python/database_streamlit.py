import sqlite3
import pandas as pd
from datetime import datetime

DB_FILE = "recovery_ledger.db"

def get_connection():
    """Returns a thread-safe connection with SQLite WAL mode enabled."""
    conn = sqlite3.connect(DB_FILE, timeout=30.0, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recovery_audit (
                id TEXT PRIMARY KEY,
                timestamp DATETIME,
                txn_id TEXT,
                customer TEXT,
                phone TEXT,
                amount REAL,
                gross_margin REAL,
                failure_reason TEXT,
                action TEXT,
                language TEXT,
                confidence_score INTEGER,
                bounce_fee_saved REAL,
                status TEXT,
                requires_approval INTEGER,
                approval_status TEXT
            )
        """)
    conn.close()

def log_recovery_event(data: dict):
    conn = get_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO recovery_audit VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """, (
            data.get("id", f"LOG_{int(datetime.now().timestamp()*1000)}"),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            data.get("txn_id"),
            data.get("customer"),
            data.get("phone"),
            float(data.get("amount", 0.0)),
            float(data.get("gross_margin", 0.40)),
            data.get("reason"),
            data.get("action"),
            data.get("language", "Hinglish"),
            int(data.get("confidence", 50)),
            float(data.get("bounce_fee_saved", 0.0)),
            data.get("status", "Contacted"),
            1 if data.get("requires_approval", False) else 0,
            data.get("approval_status", "Approved")
        ))
    conn.close()

def fetch_audit_dataframe() -> pd.DataFrame:
    conn = get_connection()
    df = pd.read_sql_query("SELECT * FROM recovery_audit ORDER BY timestamp DESC", conn)
    conn.close()
    return df

def run_custom_query(sql_query: str) -> pd.DataFrame:
    conn = get_connection()
    df = pd.read_sql_query(sql_query, conn)
    conn.close()
    return df