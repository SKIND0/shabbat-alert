-- Run once on existing production DB (pgAdmin or Railway Postgres console)

CREATE TABLE IF NOT EXISTS preset_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       VARCHAR(120) NOT NULL UNIQUE,
  city        VARCHAR(80)  NOT NULL,
  state       VARCHAR(80),
  country     VARCHAR(80)  NOT NULL,
  latitude    NUMERIC(9,6) NOT NULL,
  longitude   NUMERIC(9,6) NOT NULL,
  timezone    VARCHAR(60)  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shabbos_times_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_location_id  UUID REFERENCES preset_locations(id) ON DELETE CASCADE,
  cache_lat           NUMERIC(9,6),
  cache_lng           NUMERIC(9,6),
  parasha_date        DATE NOT NULL,
  parasha_name        VARCHAR(100),
  candle_lighting_utc TIMESTAMPTZ NOT NULL,
  sunset_utc          TIMESTAMPTZ NOT NULL,
  havdalah_utc        TIMESTAMPTZ NOT NULL,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shabbos_cache_preset_date
  ON shabbos_times_cache (preset_location_id, parasha_date)
  WHERE preset_location_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shabbos_cache_coord_date
  ON shabbos_times_cache (cache_lat, cache_lng, parasha_date)
  WHERE preset_location_id IS NULL;

ALTER TABLE shabbos_times
  ADD COLUMN IF NOT EXISTS sunset_utc TIMESTAMPTZ;

UPDATE shabbos_times
SET sunset_utc = candle_lighting_utc + INTERVAL '18 minutes'
WHERE sunset_utc IS NULL;

ALTER TABLE shabbos_times
  ALTER COLUMN sunset_utc SET NOT NULL;
