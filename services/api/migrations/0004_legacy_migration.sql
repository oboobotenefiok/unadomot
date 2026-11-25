CREATE TABLE IF NOT EXISTS legacy_map (
  entity TEXT NOT NULL,
  legacy_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, legacy_id)
);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS legacy_id TEXT UNIQUE;
