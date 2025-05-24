-- Add gym-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gym_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Update existing users to have default values
UPDATE users
SET 
    gym_name = 'Default Gym',
    country = 'Default Country'
WHERE gym_name IS NULL OR country IS NULL; 