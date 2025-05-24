-- First, modify the users table to add gym_id for gym owners
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gym_id UUID DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS gym_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Create a function to automatically set gym_id for new users
CREATE OR REPLACE FUNCTION set_gym_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gym_id IS NULL THEN
        NEW.gym_id := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set gym_id
CREATE TRIGGER set_gym_id_trigger
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_gym_id();

-- Add gym_id to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_members_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to batches table
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_batches_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to plans table
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_plans_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_payments_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to attendance table
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_attendance_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to enquiries table
ALTER TABLE enquiries
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_enquiries_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Add gym_id to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS gym_id UUID,
ADD CONSTRAINT fk_expenses_gym
    FOREIGN KEY (gym_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Update existing records to set gym_id to the first admin user's ID
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the first admin user's ID
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin exists, use the first user's ID
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM users LIMIT 1;
    END IF;
    
    -- Update all tables with the admin_id
    IF admin_id IS NOT NULL THEN
        UPDATE members SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE batches SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE plans SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE payments SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE attendance SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE enquiries SET gym_id = admin_id WHERE gym_id IS NULL;
        UPDATE expenses SET gym_id = admin_id WHERE gym_id IS NULL;
    END IF;
END $$;

-- Create RLS policies to ensure data isolation
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
CREATE POLICY "Users can only access their own gym's data" ON members
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON batches
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON plans
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON payments
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON attendance
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON enquiries
    FOR ALL
    USING (gym_id = auth.uid());

CREATE POLICY "Users can only access their own gym's data" ON expenses
    FOR ALL
    USING (gym_id = auth.uid()); 