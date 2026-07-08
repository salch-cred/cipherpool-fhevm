-- ==========================================
-- CipherTrust Protocol: Supabase Database Setup
-- Run this script inside your Supabase SQL Editor
-- ==========================================

-- Enable UUID extension for secure random IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Autonomous Agents / Robots Registry
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    agent_id INT UNIQUE NOT NULL,
    operator_address VARCHAR(42) NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    trust_variance INT DEFAULT 100,
    public_reputation_badge VARCHAR(42) DEFAULT NULL
);

-- Index for agent query optimizations
CREATE INDEX IF NOT EXISTS idx_agents_operator ON agents(operator_address);

-- Table: Redundant Telemetry Audits
CREATE TABLE IF NOT EXISTS telemetry_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id INT REFERENCES agents(agent_id) ON DELETE CASCADE,
    round_id INT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sensor_a_reading INT NOT NULL,
    sensor_b_reading INT NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_telemetry_agent_round ON telemetry_rounds(agent_id, round_id);

-- Table: Location Triangulation Log
CREATE TABLE IF NOT EXISTS location_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_address VARCHAR(42) NOT NULL,
    calculated_x INT NOT NULL,
    calculated_y INT NOT NULL,
    distance_sq_a INT NOT NULL,
    distance_sq_b INT NOT NULL,
    distance_sq_c INT NOT NULL,
    verified BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: Multi-Factor Authentication Audits
CREATE TABLE IF NOT EXISTS auth_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_address VARCHAR(42) NOT NULL,
    auth_type VARCHAR(30) NOT NULL, -- 'biometrics', 'passwordless', 'passport'
    status VARCHAR(15) NOT NULL, -- 'success', 'failed'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_user ON auth_audits(user_address);
