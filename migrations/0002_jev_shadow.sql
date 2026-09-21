CREATE TABLE jev_shadow_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_key TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  recommendation TEXT,
  confidence REAL,
  hazard_family TEXT,
  hazard_mismatch INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  payload TEXT NOT NULL
);
CREATE INDEX jev_shadow_log_generated_at ON jev_shadow_log (generated_at DESC);
CREATE INDEX jev_shadow_log_recommendation ON jev_shadow_log (recommendation);
