# Employee Management System (EMS)

A web-based HR platform for startups to manage employee onboarding, profiles, and access control through a secure, role-based dashboard.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Database Schemas](#database-schemas)
- [Authentication](#authentication)
- [API Reference](#api-reference)
  - [Auth Endpoints](#auth-endpoints)
  - [Employee Endpoints](#employee-endpoints)
- [Frontend Routes](#frontend-routes)
- [Role-Based Access Control](#role-based-access-control)

---

## Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Frontend       | React (Vite), Tailwind CSS     |
| Backend        | Node.js, Express.js            |
| Database       | MongoDB (Mongoose)             |
| Authentication | JWT, Role-Based Access Control |

---

## Project Structure

```
ems/
├── backend/
│   ├── middleware/
│   │   └── authMiddleWare.js      
│   ├── models/
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Role.js
│   │   └── Attendance.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── employeeRoutes.js
│   └── server.js
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── AdminDashboard.jsx
        │   └── EmployeeDashboard.jsx
        ├── components/
        │   ├── EmployeeDirectory.jsx
        │   └── Modals.jsx
        ├── App.jsx
        └── main.jsx
```

---

## Environment Setup

**`backend/.env`**

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Application

**Backend**

```bash
cd backend
npm install
node server.js
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

---

## Database Schemas

#### Employee

| Field        | Type   | Required | Notes                                          |
| ------------ | ------ | -------- | ---------------------------------------------- |
| `name`       | String | Yes      |                                                |
| `email`      | String | Yes      | Must be unique                                 |
| `password`   | String | Yes      | Stored as bcrypt hash                          |
| `role`       | String | No       | Enum: `Admin`, `Employee`. Default: `Employee` |
| `department` | String | No       | Default: `Unassigned`                          |
| `createdAt`  | Date   | Auto     | Mongoose timestamp                             |
| `updatedAt`  | Date   | Auto     | Mongoose timestamp                             |

#### Department _(schema ready — endpoints coming in Phase 2)_

| Field         | Type   | Required     |
| ------------- | ------ | ------------ |
| `name`        | String | Yes (unique) |
| `description` | String | No           |

#### Role _(schema ready — endpoints coming in Phase 2)_

| Field         | Type     | Required     |
| ------------- | -------- | ------------ |
| `name`        | String   | Yes (unique) |
| `permissions` | [String] | No           |

#### Attendance _(schema ready — endpoints coming in Phase 2)_

| Field          | Type     | Required | Notes                                             |
| -------------- | -------- | -------- | ------------------------------------------------- |
| `employeeId`   | ObjectId | Yes      | Ref: `Employee`                                   |
| `date`         | Date     | Yes      |                                                   |
| `status`       | String   | Yes      | Enum: `Present`, `Absent`, `Half-Day`, `On Leave` |
| `checkInTime`  | String   | No       |                                                   |
| `checkOutTime` | String   | No       |                                                   |

---

## Authentication

The API uses **JWT Bearer token** authentication. After login, include the token in the `Authorization` header on all protected requests:

```
Authorization: Bearer <your_token>
```

Tokens expire after **1 day**.

Two middleware guards are applied per route:

- `protect` — verifies the JWT and attaches the user to `req.user`
- `admin` — checks that `req.user.role === 'Admin'`

---

## API Reference

**Base URL:** `http://localhost:5000/api`

---

### Auth Endpoints

#### `POST /auth/login`

Authenticates a user and returns a JWT token.

- **Auth required:** No

**Request Body**

```json
{
  "email": "admin@company.com",
  "password": "yourpassword"
}
```

**Success — `200 OK`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "admin@company.com",
    "role": "Admin"
  }
}
```

**Error Responses**

| Status | Message                           | Cause                |
| ------ | --------------------------------- | -------------------- |
| `400`  | `Email and password are required` | Missing fields       |
| `400`  | `Invalid credentials`             | Wrong password       |
| `404`  | `User not found`                  | Email not registered |
| `500`  | `{ error: "..." }`                | Server error         |

---

### Employee Endpoints

All employee endpoints require the `protect` middleware. Admin-only routes additionally require `admin`.

---

#### `GET /employees/me`

Returns the profile of the currently logged-in employee.

- **Auth required:** Yes
- **Admin only:** No

**Success — `200 OK`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
  "name": "Jane Smith",
  "email": "jane@company.com",
  "role": "Employee",
  "department": "Engineering",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**

| Status | Message                        | Cause                          |
| ------ | ------------------------------ | ------------------------------ |
| `401`  | `Not authorized, no token`     | Missing Authorization header   |
| `401`  | `Not authorized, token failed` | Invalid or expired token       |
| `404`  | `Employee not found`           | User deleted after token issue |

---

#### `GET /employees`

Returns all employees (passwords excluded).

- **Auth required:** Yes
- **Admin only:** Yes

**Success — `200 OK`**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "John Doe",
    "email": "admin@company.com",
    "role": "Admin",
    "department": "Management",
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-10T08:00:00.000Z"
  }
]
```

**Error Responses**

| Status | Message                      | Cause                  |
| ------ | ---------------------------- | ---------------------- |
| `401`  | `Not authorized, no token`   | Missing token          |
| `403`  | `Not authorized as an Admin` | Requester is not Admin |

---

#### `POST /employees`

Creates and onboards a new employee.

- **Auth required:** Yes
- **Admin only:** Yes

**Request Body**

```json
{
  "name": "Alice Johnson",
  "email": "alice@company.com",
  "password": "securepassword123",
  "role": "Employee",
  "department": "Design"
}
```

| Field        | Type   | Required | Notes                            |
| ------------ | ------ | -------- | -------------------------------- |
| `name`       | String | Yes      |                                  |
| `email`      | String | Yes      | Must be unique                   |
| `password`   | String | Yes      | Plain text; hashed before saving |
| `role`       | String | No       | `Admin` or `Employee`            |
| `department` | String | No       | Defaults to `Unassigned`         |

**Success — `201 Created`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
  "name": "Alice Johnson",
  "email": "alice@company.com",
  "role": "Employee",
  "department": "Design",
  "createdAt": "2024-02-01T09:00:00.000Z",
  "updatedAt": "2024-02-01T09:00:00.000Z"
}
```

**Error Responses**

| Status | Message                                  | Cause                   |
| ------ | ---------------------------------------- | ----------------------- |
| `400`  | `Name, email, and password are required` | Missing required fields |
| `400`  | `Email already in use`                   | Duplicate email         |
| `401`  | `Not authorized, no token`               | Missing token           |
| `403`  | `Not authorized as an Admin`             | Requester is not Admin  |

---

#### `PUT /employees/:id`

Updates an existing employee's profile. Leave `password` blank to keep the current one.

- **Auth required:** Yes
- **Admin only:** Yes
- **URL Param:** `id` — MongoDB ObjectId of the target employee

**Request Body**

```json
{
  "name": "Alice Johnson",
  "email": "alice.new@company.com",
  "role": "Employee",
  "department": "Product",
  "password": ""
}
```

| Field        | Type   | Required | Notes                                      |
| ------------ | ------ | -------- | ------------------------------------------ |
| `name`       | String | Yes      |                                            |
| `email`      | String | Yes      |                                            |
| `role`       | String | No       | `Admin` or `Employee`                      |
| `department` | String | No       |                                            |
| `password`   | String | No       | If blank or omitted, password is unchanged |

**Success — `200 OK`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
  "name": "Alice Johnson",
  "email": "alice.new@company.com",
  "role": "Employee",
  "department": "Product",
  "createdAt": "2024-02-01T09:00:00.000Z",
  "updatedAt": "2024-02-10T11:00:00.000Z"
}
```

**Security Rules**

| Scenario                                       | Response                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Admin tries to demote themselves to `Employee` | `403` — `Security Action Blocked: You cannot demote yourself from Admin status.`                        |
| Admin tries to edit another Admin's account    | `403` — `Security Action Blocked: You do not have clearance to modify another Administrator's account.` |

**Error Responses**

| Status | Message                             | Cause                    |
| ------ | ----------------------------------- | ------------------------ |
| `400`  | `Name and email are required`       | Missing required fields  |
| `401`  | `Not authorized, no token`          | Missing token            |
| `403`  | `Not authorized as an Admin`        | Requester is not Admin   |
| `403`  | Security Action Blocked (see above) | Admin security violation |
| `404`  | `Employee not found`                | Invalid ID               |

---

#### `DELETE /employees/:id`

Permanently deletes an employee record.

- **Auth required:** Yes
- **Admin only:** Yes
- **URL Param:** `id` — MongoDB ObjectId of the target employee

**Success — `200 OK`**

```json
{
  "message": "Employee deleted successfully"
}
```

**Security Rules**

| Scenario                                | Response                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------- | 
| Admin tries to delete their own account | `403` — `Security Action Blocked: You cannot delete your own admin account.`                |
| Admin tries to delete another Admin     | `403` — `Security Action Blocked: You do not have clearance to delete another Administrator.|

**Error Responses**

| Status | Message                             | Cause                    |
| ------ | ----------------------------------- | ------------------------ |
| `401`  | `Not authorized, no token`          | Missing token            |
| `403`  | `Not authorized as an Admin`        | Requester is not Admin   |
| `403`  | Security Action Blocked (see above) | Admin security violation |
| `404`  | `Employee not found`                | Invalid ID               |

---

## Frontend Routes

| Path                        | Component           | Access        |
| --------------------------- | ------------------- | ------------- |
| `/`                         | `Login`             | Public        |
| `/admin-dashboard/:slug`    | `AdminDashboard`    | Admin only    |
| `/employee-dashboard/:slug` | `EmployeeDashboard` | Employee only |

The `:slug` is generated after login as `{firstName}-{last8charsOfId}` (e.g., `john-a8b9c0d1`). `ProtectedRoute` enforces role-based redirection — accessing the wrong role's URL redirects to the correct dashboard automatically.

---

## Role-Based Access Control

| Action                   | Admin | Employee |
| ------------------------ | ----- | -------- |
| Login                    | ✅    | ✅       |
| View own profile (`/me`) | ✅    | ✅       |
| View all employees       | ✅    | ❌       |
| Add employee             | ✅    | ❌       |
| Edit employee            | ✅    | ❌       |
| Delete employee          | ✅    | ❌       |
