/*
  # Fix Users Table RLS Policies

  1. Changes
    - Remove recursive policy checks
    - Simplify admin access policy
    - Add direct user access policy
    - Enable RLS on users table

  2. Security
    - Enable RLS
    - Add policies for admin and user access
    - Prevent infinite recursion
*/

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can update user profiles" ON users;
DROP POLICY IF EXISTS "Admin can view all user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Create new policies without recursion
CREATE POLICY "Admin can manage all users"
ON users
FOR ALL
TO authenticated
USING (
  role = 'admin'
);

CREATE POLICY "Users can view and update own profile"
ON users
FOR ALL
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);