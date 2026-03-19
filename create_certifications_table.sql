-- DDL query for Supabase SQL Editor
-- This file is for the user to copy/paste or run directly in Supabase
DROP TABLE IF EXISTS certifications;

CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    cert_date VARCHAR(50),
    exp_date VARCHAR(50),
    farmer_name VARCHAR(255) NOT NULL,
    plot_code VARCHAR(100),
    crop_name VARCHAR(255),
    plot_type VARCHAR(100),
    area_rai NUMERIC,
    production_volume_kg NUMERIC,
    plot_moo VARCHAR(50),
    plot_subdistrict VARCHAR(100),
    plot_district VARCHAR(100),
    farmer_moo VARCHAR(50),
    farmer_subdistrict VARCHAR(100),
    farmer_district VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
