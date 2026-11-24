-- Account-only database. Livestock records and subscriptions are NOT yet stored here.
CREATE TABLE IF NOT EXISTS lm_auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lm_auth_users_name_valid CHECK (char_length(full_name) BETWEEN 2 AND 120)
);
CREATE TABLE IF NOT EXISTS lm_auth_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lm_auth_sessions_user_id_idx ON lm_auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS lm_auth_sessions_exp_idx ON lm_auth_sessions (expires_at);
CREATE TABLE IF NOT EXISTS lm_auth_tokens (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lm_auth_tokens_user_purpose_idx ON lm_auth_tokens (user_id,purpose);
CREATE INDEX IF NOT EXISTS lm_auth_tokens_exp_idx ON lm_auth_tokens (expires_at);


-- Account-scoped farm documents; existing livestock data is first imported from
-- the browser after authentication. Version enforces optimistic concurrency.
CREATE TABLE IF NOT EXISTS lm_farm_records (
  user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
  record_key text NOT NULL,
  data jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,record_key)
);
CREATE INDEX IF NOT EXISTS lm_farm_records_recent_idx
  ON lm_farm_records(user_id,updated_at DESC);

-- V5 preview uses individual, farmer-owned animal rows; NEVER reads v4 livestockAnimals.
CREATE TABLE IF NOT EXISTS lm_v5_animals (
 user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 animal_id varchar(80) NOT NULL,
 data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
 version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,animal_id)
);
CREATE INDEX IF NOT EXISTS lm_v5_animals_recent ON lm_v5_animals(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS lm_v5_animal_photos (
 user_id uuid NOT NULL,
 animal_id varchar(80) NOT NULL,
 photo text NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK (version>=1),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,animal_id),
 FOREIGN KEY(user_id,animal_id) REFERENCES lm_v5_animals(user_id,animal_id) ON DELETE CASCADE
);

-- Subscription billing (PayFast). Status only changes from a verified ITN.
CREATE TABLE IF NOT EXISTS lm_billing_subscriptions (
 user_id uuid PRIMARY KEY REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 plan text NOT NULL,
 status text NOT NULL CHECK (status IN ('active','past_due','cancelled')),
 pf_token text UNIQUE,
 current_period_end timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lm_billing_payments (
 m_payment_id text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 plan text NOT NULL,
 amount numeric(10,2) NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lm_billing_payments_user_idx ON lm_billing_payments(user_id);
CREATE TABLE IF NOT EXISTS lm_billing_events (
 event_key text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 payment_status text NOT NULL,
 amount_gross numeric(10,2) NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- Email alert preferences (daily digest). One row per user, created on first use.
CREATE TABLE IF NOT EXISTS lm_alert_prefs (
 user_id uuid PRIMARY KEY REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 email_alerts boolean NOT NULL DEFAULT true,
 last_digest_on date,
 updated_at timestamptz NOT NULL DEFAULT now()
);

-- V5.2 multi-farm: existing records remain in the account's "main" farm.
-- No deletion or copying of livestock data during migration.
CREATE TABLE IF NOT EXISTS lm_farms (
 user_id uuid NOT NULL REFERENCES lm_auth_users(id) ON DELETE CASCADE,
 farm_id text NOT NULL CHECK (farm_id ~ '^(main|[a-f0-9-]{36})$'),
 name varchar(120) NOT NULL,
 location varchar(160) NOT NULL DEFAULT '',
 operation varchar(40) NOT NULL DEFAULT 'Mixed livestock',
 map_url text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,farm_id)
);
INSERT INTO lm_farms(user_id,farm_id,name)
 SELECT id,'main','My Farm' FROM lm_auth_users ON CONFLICT DO NOTHING;
ALTER TABLE lm_v5_animals ADD COLUMN IF NOT EXISTS farm_id text NOT NULL DEFAULT 'main';
CREATE INDEX IF NOT EXISTS lm_v5_animals_by_farm ON lm_v5_animals(user_id,farm_id,updated_at DESC);

-- V5.4 founder administration audit: only minimum non-sensitive metadata.
CREATE TABLE IF NOT EXISTS lm_admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid NOT NULL REFERENCES lm_auth_users(id),
 action varchar(80) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lm_admin_audit_recent ON lm_admin_audit(created_at DESC);
