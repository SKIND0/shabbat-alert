-- ============================================================
-- Shabbos Alert — PostgreSQL Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- USERS
-- Core subscriber table. One row per person who signs up.
-- ------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  phone           VARCHAR(20)  NOT NULL UNIQUE,   -- E.164 format, e.g. +12125550100
  email           VARCHAR(255),                   -- optional, reserved for AWS SES later
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE  -- soft-delete / unsubscribe flag
);

-- ------------------------------------------------------------
-- USER LOCATIONS
-- Stores lat/lon (from browser GPS or manual entry) plus a
-- human-readable label. A user can have multiple saved locations
-- (home, office, parents' house) but only one is "primary".
-- ------------------------------------------------------------
CREATE TABLE user_locations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           VARCHAR(100),                   -- e.g. "Home", "Brooklyn"
  latitude        NUMERIC(9,6) NOT NULL,
  longitude       NUMERIC(9,6) NOT NULL,
  timezone        VARCHAR(60)  NOT NULL,          -- IANA tz, e.g. "America/New_York"
  is_primary      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Only one primary location per user
CREATE UNIQUE INDEX uq_user_primary_location
  ON user_locations(user_id)
  WHERE is_primary = TRUE;

-- ------------------------------------------------------------
-- USER PREFERENCES
-- Alert timing and zmanim opinion (minhag) per user.
-- Kept separate from users so defaults are easy to change.
-- ------------------------------------------------------------
CREATE TABLE user_preferences (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- How many minutes before candle-lighting to send the first alert
  alert_minutes_before INTEGER   NOT NULL DEFAULT 18,

  -- Zmanim opinion / minhag
  -- 'gra'       — Vilna Gaon / GRA (default for most Ashkenaz)
  -- 'ma'        — Magen Avraham (earlier zmanim, some Chasidish)
  -- 'rt'        — Rabbeinu Tam (72-min Shabbos end, some Sephardim & Chasidim)
  zmanim_opinion      VARCHAR(10) NOT NULL DEFAULT 'gra'
                        CHECK (zmanim_opinion IN ('gra', 'ma', 'rt')),

  -- Whether user also wants Havdalah reminder
  havdalah_alert      BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Quiet hours — don't send alerts outside this window (local time)
  quiet_hours_start   TIME,                       -- e.g. 22:00
  quiet_hours_end     TIME,                       -- e.g. 08:00

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- SHABBOS TIMES CACHE
-- Stores the candle-lighting / Havdalah times fetched from
-- Hebcal so we're not hammering the external API on every send.
-- Keyed on (location_id, parasha_date).
-- ------------------------------------------------------------
CREATE TABLE shabbos_times (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id         UUID        NOT NULL REFERENCES user_locations(id) ON DELETE CASCADE,
  parasha_date        DATE        NOT NULL,       -- The Friday of that Shabbos
  parasha_name        VARCHAR(100),              -- e.g. "Behar-Bechukotai"
  candle_lighting_utc TIMESTAMPTZ NOT NULL,
  havdalah_utc        TIMESTAMPTZ NOT NULL,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, parasha_date)
);

-- ------------------------------------------------------------
-- ALERT LOG
-- Every SMS sent via Twilio gets a row here for auditing,
-- retry logic, and future AWS S3 export / analytics.
-- ------------------------------------------------------------
CREATE TABLE alert_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  shabbos_time_id UUID        REFERENCES shabbos_times(id) ON DELETE SET NULL,
  alert_type      VARCHAR(20) NOT NULL            -- 'candle_lighting' | 'havdalah'
                    CHECK (alert_type IN ('candle_lighting', 'havdalah')),
  scheduled_for   TIMESTAMPTZ NOT NULL,           -- when the alert was supposed to go out
  sent_at         TIMESTAMPTZ,                    -- null until actually sent
  twilio_sid      VARCHAR(50),                    -- Twilio MessageSid for status callbacks
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'unsubscribed')),
  error_message   TEXT,                           -- populated on failure
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the scheduler: find pending alerts that are due
CREATE INDEX idx_alert_log_pending
  ON alert_log(scheduled_for)
  WHERE status = 'pending';

-- Index for per-user alert history
CREATE INDEX idx_alert_log_user
  ON alert_log(user_id, scheduled_for DESC);

-- ------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: one test user (delete before production)
-- ============================================================
INSERT INTO users (name, phone)
  VALUES ('Test User', '+10000000000');

INSERT INTO user_locations (user_id, label, latitude, longitude, timezone)
  SELECT id, 'Brooklyn', 40.6782, -73.9442, 'America/New_York'
  FROM users WHERE phone = '+10000000000';

INSERT INTO user_preferences (user_id)
  SELECT id FROM users WHERE phone = '+10000000000';
