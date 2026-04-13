DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('driver', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('paid', 'pending');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM ('waiting', 'loading', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'driver',
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  park_id VARCHAR(20) UNIQUE,
  license_number VARCHAR(50) UNIQUE,
  plate_number VARCHAR(20) UNIQUE,
  passport_photo TEXT,
  email_verification_token VARCHAR(255),
  email_verification_sent_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  status user_status NOT NULL DEFAULT 'pending',
  deletion_requested_at TIMESTAMPTZ,
  deletion_eligible_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_eligible_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS daily_payments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  UNIQUE (driver_id, payment_date)
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status queue_status NOT NULL DEFAULT 'waiting',
  loading_started_at TIMESTAMPTZ
);

ALTER TABLE queue_entries
ADD COLUMN IF NOT EXISTS loading_started_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS cooldown_log (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  driver_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_join TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status_timestamp ON queue_entries(status, join_timestamp);
CREATE INDEX IF NOT EXISTS idx_daily_payments_driver_date ON daily_payments(driver_id, payment_date);
