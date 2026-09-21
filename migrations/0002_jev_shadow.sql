CREATE TABLE jev_shadow_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_key TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX jev_shadow_log_generated_at ON jev_shadow_log (generated_at DESC);
