-- Additive: persist the alias we sent (`jev-latest`) next to the resolved response model id.
ALTER TABLE jev_shadow_log ADD COLUMN requested_model TEXT;
CREATE INDEX IF NOT EXISTS jev_shadow_log_model ON jev_shadow_log (model);
