# Gym Management System

A scalable Node.js backend using Express.js integrated with Supabase for authentication and database management.

## Features

- Secure authentication with role-based access control (Admin, Staff, Trainer)
- Member management with status tracking and batch assignment
- Attendance tracking and reporting
- Payment processing with due amount calculations
- Membership plans and services management
- Staff management with permission controls
- Comprehensive reporting system
- Enquiry management with WhatsApp integration

## Technology Stack

- Node.js with Express.js
- Supabase for database and authentication
- JWT-based session handling
- Role-based access control

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A Supabase account and project

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gym-management-system.git
   cd gym-management-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your Supabase credentials

4. Run the migrations on your Supabase project to create the database schema

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login user
- `POST /api/auth/logout`: Logout user
- `GET /api/auth/me`: Get current user profile

### Members
- `GET /api/members`: Get all members
- `GET /api/members/:id`: Get a specific member
- `POST /api/members`: Create a new member
- `PUT /api/members/:id`: Update a member
- `DELETE /api/members/:id`: Delete a member

### Batches
- `GET /api/batches`: Get all batches
- `GET /api/batches/:id`: Get a specific batch
- `GET /api/batches/:id/members`: Get members in a batch
- `POST /api/batches`: Create a new batch
- `PUT /api/batches/:id`: Update a batch
- `DELETE /api/batches/:id`: Delete a batch

### Attendance
- `GET /api/attendance`: Get attendance records
- `GET /api/attendance/report`: Get attendance report
- `POST /api/attendance`: Record attendance for a member
- `POST /api/attendance/batch`: Record batch attendance

### Payments
- `GET /api/payments`: Get all payments
- `GET /api/payments/summary`: Get payment summary
- `GET /api/payments/member/:memberId`: Get payments by member
- `GET /api/payments/:id`: Get a specific payment
- `POST /api/payments`: Create a new payment
- `PUT /api/payments/:id`: Update a payment
- `DELETE /api/payments/:id`: Delete a payment

### Plans
- `GET /api/plans`: Get all plans
- `GET /api/plans/:id`: Get a specific plan
- `POST /api/plans`: Create a new plan
- `PUT /api/plans/:id`: Update a plan
- `DELETE /api/plans/:id`: Delete a plan

### Services
- `GET /api/services`: Get all services
- `GET /api/services/:id`: Get a specific service
- `POST /api/services`: Create a new service
- `PUT /api/services/:id`: Update a service
- `DELETE /api/services/:id`: Delete a service

### Enquiries
- `GET /api/enquiries`: Get all enquiries
- `GET /api/enquiries/:id`: Get a specific enquiry
- `POST /api/enquiries`: Create a new enquiry
- `PUT /api/enquiries/:id`: Update an enquiry
- `DELETE /api/enquiries/:id`: Delete an enquiry
- `PATCH /api/enquiries/:id/status`: Change enquiry status

### Staff
- `GET /api/staff`: Get all staff
- `GET /api/staff/:id`: Get a specific staff
- `POST /api/staff`: Create a new staff
- `PUT /api/staff/:id`: Update a staff
- `DELETE /api/staff/:id`: Delete a staff
- `PATCH /api/staff/:id/permissions`: Update staff permissions

### Expenses
- `GET /api/expenses`: Get all expenses
- `GET /api/expenses/summary`: Get expense summary
- `GET /api/expenses/:id`: Get a specific expense
- `POST /api/expenses`: Create a new expense
- `PUT /api/expenses/:id`: Update an expense
- `DELETE /api/expenses/:id`: Delete an expense

### Reports
- `GET /api/reports/expiring-memberships`: Get expiring memberships report
- `GET /api/reports/birthdays`: Get upcoming birthdays report
- `GET /api/reports/payment-status`: Get payment status report
- `GET /api/reports/attendance-summary`: Get attendance summary report
- `GET /api/reports/financial-summary`: Get financial summary report

## License

This project is licensed under the MIT License