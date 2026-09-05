CREATE TABLE source_snapshots (
  source TEXT PRIMARY KEY,
  payload TEXT NOT NULL
);
CREATE TABLE relay_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  generated_at TEXT,
  lease_token TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT INTO relay_state (id) VALUES (1);
