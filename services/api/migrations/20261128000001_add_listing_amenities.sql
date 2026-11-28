-- Listings carry a free-form list of amenities ("Borehole", "Prepaid meter",
-- "24/7 security"). Stored as a text array so the detail endpoint can return
-- them without a join, and defaulted to empty so existing rows stay valid.

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}';
