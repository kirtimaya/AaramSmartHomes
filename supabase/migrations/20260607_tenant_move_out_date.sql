-- Add move_out_date column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS move_out_date DATE;
