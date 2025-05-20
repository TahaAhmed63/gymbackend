/*
  # Initial Schema for Gym Management System
  
  1. Tables
     - `users` - User profiles with authentication data
     - `members` - Gym members information
     - `batches` - Training batch schedules
     - `plans` - Membership plans
     - `services` - Additional services offered
     - `attendance` - Member attendance records
     - `payments` - Payment records
     - `enquiries` - Customer enquiries
     - `staff` - Staff information
     - `expenses` - Gym expenses
     
  2. Security
     - Row Level Security enabled on all tables
     - Appropriate policies for each user role
*/

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for staff profiles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'trainer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all user profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin can update user profiles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  schedule_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on batches table
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Policies for batches table
CREATE POLICY "Authenticated users can view batches"
  ON batches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create batches"
  ON batches
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update batches"
  ON batches
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete batches"
  ON batches
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_in_months INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on plans table
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Policies for plans table
CREATE POLICY "Authenticated users can view plans"
  ON plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create plans"
  ON plans
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update plans"
  ON plans
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete plans"
  ON plans
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on services table
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policies for services table
CREATE POLICY "Authenticated users can view services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  join_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  batch_id UUID REFERENCES batches(id),
  plan_id UUID REFERENCES plans(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on members table
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies for members table
CREATE POLICY "Authenticated users can view members"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create members"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update members"
  ON members
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete members"
  ON members
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, date)
);

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policies for attendance table
CREATE POLICY "Authenticated users can view attendance"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, staff, and trainers can create attendance"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff', 'trainer')
  ));

CREATE POLICY "Admin, staff, and trainers can update attendance"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff', 'trainer')
  ));

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  due_amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments table
CREATE POLICY "Authenticated users can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Enquiries table
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on enquiries table
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Policies for enquiries table
CREATE POLICY "Authenticated users can view enquiries"
  ON enquiries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create enquiries"
  ON enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update enquiries"
  ON enquiries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete enquiries"
  ON enquiries
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{"add": false, "edit": false, "delete": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policies for staff table
CREATE POLICY "Authenticated users can view staff"
  ON staff
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses table
CREATE POLICY "Authenticated users can view expenses"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and staff can create expenses"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin and staff can update expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
  ));

CREATE POLICY "Admin can delete expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Function to get members with membership expiry approaching
CREATE OR REPLACE FUNCTION get_expiring_memberships(days_range INT)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  plan_name TEXT,
  join_date DATE,
  expiry_date DATE,
  days_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.name AS member_name,
    p.name AS plan_name,
    m.join_date,
    (m.join_date + (p.duration_in_months * INTERVAL '1 month'))::DATE AS expiry_date,
    (m.join_date + (p.duration_in_months * INTERVAL '1 month') - CURRENT_DATE)::INT AS days_remaining
  FROM
    members m
    JOIN plans p ON m.plan_id = p.id
  WHERE
    m.status = 'active'
    AND (m.join_date + (p.duration_in_months * INTERVAL '1 month') - CURRENT_DATE) BETWEEN 0 AND days_range
  ORDER BY
    days_remaining;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming birthdays
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(days_range INT)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  birthday DATE,
  days_until_birthday INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS member_id,
    m.name AS member_name,
    m.dob AS birthday,
    CASE
      WHEN (DATE_PART('month', m.dob) > DATE_PART('month', CURRENT_DATE)) OR
           (DATE_PART('month', m.dob) = DATE_PART('month', CURRENT_DATE) AND 
            DATE_PART('day', m.dob) >= DATE_PART('day', CURRENT_DATE))
      THEN ((DATE_PART('month', m.dob) - DATE_PART('month', CURRENT_DATE)) * 30 + 
            (DATE_PART('day', m.dob) - DATE_PART('day', CURRENT_DATE)))::INT
      ELSE ((DATE_PART('month', m.dob) + 12 - DATE_PART('month', CURRENT_DATE)) * 30 + 
            (DATE_PART('day', m.dob) - DATE_PART('day', CURRENT_DATE)))::INT
    END AS days_until_birthday
  FROM
    members m
  WHERE
    m.dob IS NOT NULL
    AND m.status = 'active'
    AND CASE
      WHEN (DATE_PART('month', m.dob) > DATE_PART('month', CURRENT_DATE)) OR
           (DATE_PART('month', m.dob) = DATE_PART('month', CURRENT_DATE) AND 
            DATE_PART('day', m.dob) >= DATE_PART('day', CURRENT_DATE))
      THEN ((DATE_PART('month', m.dob) - DATE_PART('month', CURRENT_DATE)) * 30 + 
            (DATE_PART('day', m.dob) - DATE_PART('day', CURRENT_DATE)))::INT
      ELSE ((DATE_PART('month', m.dob) + 12 - DATE_PART('month', CURRENT_DATE)) * 30 + 
            (DATE_PART('day', m.dob) - DATE_PART('day', CURRENT_DATE)))::INT
    END BETWEEN 0 AND days_range
  ORDER BY
    days_until_birthday;
END;
$$ LANGUAGE plpgsql;