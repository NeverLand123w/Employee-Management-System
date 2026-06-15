# Employee Management System (EMS)

A web-based HR platform for startups to manage employee onboarding, profiles, attendance, leave, and access control through a secure, role-based dashboard.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
  - [Auth Endpoints](#auth-endpoints)
  - [Employee Endpoints](#employee-endpoints)
  - [Attendance Endpoints](#attendance-endpoints)
  - [Leave Endpoints](#leave-endpoints)
  - [Notification Endpoints](#notification-endpoints)
- [Module Documentation](#module-documentation)
  - [Project Structure](#project-structure)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
  - [Database Schemas](#database-schemas)
  - [Authentication](#authentication)
  - [Frontend Routes & Dashboards](#frontend-routes--dashboards)
  - [Leave Balance Logic](#leave-balance-logic)
  - [Notification Flow](#notification-flow)
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

# API Documentation

**Demo Video:** [Video](https://drive.google.com/file/d/1U1yym5DAcTDlaJRbudQp-JTZ5ewcyGel/view?usp=sharing)

**Base URL:** `http://localhost:5000/api`

All endpoints (except `/auth/login`) require JWT Bearer token authentication. See [Authentication](#authentication) for the header format.

---

## Auth Endpoints

### `POST /auth/login`

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
| ------ | ----------------------------------- | --------------------- |
| `400`  | `Email and password are required`   | Missing fields        |
| `400`  | `Invalid credentials`                | Wrong password        |
| `404`  | `User not found`                     | Email not registered  |
| `500`  | `{ error: "..." }`                   | Server error          |

---

## Employee Endpoints

All employee endpoints require the `protect` middleware. Admin-only routes additionally require `admin`.

### `GET /employees/me`

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

| Status | Message                          | Cause                            |
| ------ | ----------------------------------- | ---------------------------------- |
| `401`  | `Not authorized, no token`          | Missing Authorization header       |
| `401`  | `Not authorized, token failed`      | Invalid or expired token           |
| `404`  | `Employee not found`                | User deleted after token issue     |

---

### `GET /employees`

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

| Status | Message                       | Cause                   |
| ------ | -------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`       | Missing token               |
| `403`  | `Not authorized as an Admin`     | Requester is not Admin      |

---

### `POST /employees`

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

| Field        | Type   | Required | Notes                              |
| ------------ | ------ | -------- | -------------------------------------- |
| `name`       | String | Yes      |                                       |
| `email`      | String | Yes      | Must be unique                       |
| `password`   | String | Yes      | Plain text; hashed before saving     |
| `role`       | String | No       | `Admin` or `Employee`                |
| `department` | String | No       | Defaults to `Unassigned`             |

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

| Status | Message                                    | Cause                     |
| ------ | --------------------------------------------- | --------------------------- |
| `400`  | `Name, email, and password are required`      | Missing required fields     |
| `400`  | `Email already in use`                         | Duplicate email             |
| `401`  | `Not authorized, no token`                     | Missing token                |
| `403`  | `Not authorized as an Admin`                   | Requester is not Admin       |

---

### `PUT /employees/:id`

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

| Field        | Type   | Required | Notes                                       |
| ------------ | ------ | -------- | ----------------------------------------------- |
| `name`       | String | Yes      |                                                |
| `email`      | String | Yes      |                                                |
| `role`       | String | No       | `Admin` or `Employee`                         |
| `department` | String | No       |                                                |
| `password`   | String | No       | If blank or omitted, password is unchanged    |

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

| Scenario                                          | Response                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Admin tries to demote themselves to `Employee`        | `403` — `Security Action Blocked: You cannot demote yourself from Admin status.`                          |
| Admin tries to edit another Admin's account           | `403` — `Security Action Blocked: You do not have clearance to modify another Administrator's account.`  |

**Error Responses**

| Status | Message                              | Cause                     |
| ------ | --------------------------------------- | --------------------------- |
| `400`  | `Name and email are required`           | Missing required fields      |
| `401`  | `Not authorized, no token`              | Missing token                 |
| `403`  | `Not authorized as an Admin`            | Requester is not Admin        |
| `403`  | Security Action Blocked (see above)     | Admin security violation      |
| `404`  | `Employee not found`                    | Invalid ID                     |

---

### `DELETE /employees/:id`

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

| Scenario                                  | Response                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Admin tries to delete their own account        | `403` — `Security Action Blocked: You cannot delete your own admin account.`                       |
| Admin tries to delete another Admin            | `403` — `Security Action Blocked: You do not have clearance to delete another Administrator.`      |

**Error Responses**

| Status | Message                              | Cause                     |
| ------ | --------------------------------------- | --------------------------- |
| `401`  | `Not authorized, no token`              | Missing token                 |
| `403`  | `Not authorized as an Admin`            | Requester is not Admin        |
| `403`  | Security Action Blocked (see above)     | Admin security violation      |
| `404`  | `Employee not found`                    | Invalid ID                     |

---

## Attendance Endpoints

### `POST /attendance/mark`

Marks attendance for the currently logged-in employee. The first call of the day creates a check-in record. The second call on the same day sets the check-out time. A third call on the same day is rejected.

- **Auth required:** Yes
- **Admin only:** No

**First call of the day — `201 Created`** _(check-in)_

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
  "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "date": "2024-03-01T00:00:00.000Z",
  "status": "Present",
  "checkInTime": "2024-03-01T09:02:11.000Z",
  "checkOutTime": null
}
```

**Second call of the day — `200 OK`** _(check-out)_

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
  "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "date": "2024-03-01T00:00:00.000Z",
  "status": "Present",
  "checkInTime": "2024-03-01T09:02:11.000Z",
  "checkOutTime": "2024-03-01T18:15:44.000Z"
}
```

**Error Responses**

| Status | Message                                      | Cause                        |
| ------ | ------------------------------------------------ | ------------------------------- |
| `400`  | `You have already checked out for today.`         | Third call on the same day        |
| `401`  | `Not authorized, no token`                         | Missing Authorization header       |
| `401`  | `Not authorized, token failed`                     | Invalid or expired token            |

---

### `GET /attendance/me`

Returns the last 90 attendance records for the currently logged-in employee, sorted newest first.

- **Auth required:** Yes
- **Admin only:** No

**Success — `200 OK`**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
    "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "date": "2024-03-01T00:00:00.000Z",
    "status": "Present",
    "checkInTime": "2024-03-01T09:02:11.000Z",
    "checkOutTime": "2024-03-01T18:15:44.000Z"
  }
]
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`            | Missing token                |
| `401`  | `Not authorized, token failed`        | Invalid or expired token      |

---

### `GET /attendance`

Returns a paginated list of all employee attendance records. Supports optional date-range filtering. Results are sorted newest first.

- **Auth required:** Yes
- **Admin only:** Yes

**Query Parameters**

| Parameter   | Type   | Required | Default | Notes                                                |
| ----------- | ------ | -------- | ------- | --------------------------------------------------- |
| `page`      | Number | No       | `1`     | Page number                                          |
| `limit`     | Number | No       | `25`    | Records per page                                     |
| `startDate` | String | No       | —       | ISO date string. Must be paired with `endDate`        |
| `endDate`   | String | No       | —       | ISO date string. End-of-day time applied server-side  |

**Example Request**

```
GET /attendance?page=1&limit=25&startDate=2024-03-01&endDate=2024-03-31
```

**Success — `200 OK`**

```json
{
  "records": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
      "employeeId": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Jane Smith",
        "email": "jane@company.com",
        "department": "Engineering"
      },
      "date": "2024-03-01T00:00:00.000Z",
      "status": "Present",
      "checkInTime": "2024-03-01T09:02:11.000Z",
      "checkOutTime": "2024-03-01T18:15:44.000Z"
    }
  ],
  "totalPages": 4,
  "currentPage": 1
}
```

**Error Responses**

| Status | Message                       | Cause                   |
| ------ | -------------------------------- | --------------------------- |
| `401`  | `Not authorized, no token`       | Missing token                 |
| `403`  | `Not authorized as an Admin`     | Requester is not Admin        |

---

## Leave Endpoints

### `POST /leaves/apply`

Submits a new leave request for the currently logged-in employee. On success, a notification is automatically created for every Admin in the system.

- **Auth required:** Yes
- **Admin only:** No

**Request Body**

```json
{
  "leaveType": "Casual",
  "startDate": "2024-03-10",
  "endDate": "2024-03-12",
  "reason": "Family event"
}
```

| Field       | Type   | Required | Notes                            |
| ----------- | ------ | -------- | ----------------------------------- |
| `leaveType` | String | Yes      | Enum: `Sick`, `Casual`, `Annual`     |
| `startDate` | Date   | Yes      | ISO date string                      |
| `endDate`   | Date   | Yes      | ISO date string                      |
| `reason`    | String | Yes      |                                      |

**Success — `201 Created`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
  "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "leaveType": "Casual",
  "startDate": "2024-03-10T00:00:00.000Z",
  "endDate": "2024-03-12T00:00:00.000Z",
  "reason": "Family event",
  "status": "Pending",
  "createdAt": "2024-03-05T11:00:00.000Z",
  "updatedAt": "2024-03-05T11:00:00.000Z"
}
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `400`  | `All fields are required`             | Any field is missing          |
| `401`  | `Not authorized, no token`            | Missing token                  |
| `401`  | `Not authorized, token failed`        | Invalid or expired token        |

---

### `GET /leaves/me`

Returns all leave requests submitted by the currently logged-in employee, sorted newest first.

- **Auth required:** Yes
- **Admin only:** No

**Success — `200 OK`**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
    "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "leaveType": "Casual",
    "startDate": "2024-03-10T00:00:00.000Z",
    "endDate": "2024-03-12T00:00:00.000Z",
    "reason": "Family event",
    "status": "Approved",
    "createdAt": "2024-03-05T11:00:00.000Z",
    "updatedAt": "2024-03-06T09:00:00.000Z"
  }
]
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`            | Missing token                  |
| `401`  | `Not authorized, token failed`        | Invalid or expired token        |

---

### `GET /leaves`

Returns all leave requests across all employees, with employee details populated. Sorted newest first.

- **Auth required:** Yes
- **Admin only:** Yes

**Success — `200 OK`**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
    "employeeId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Smith",
      "email": "jane@company.com",
      "department": "Engineering"
    },
    "leaveType": "Casual",
    "startDate": "2024-03-10T00:00:00.000Z",
    "endDate": "2024-03-12T00:00:00.000Z",
    "reason": "Family event",
    "status": "Pending",
    "createdAt": "2024-03-05T11:00:00.000Z",
    "updatedAt": "2024-03-05T11:00:00.000Z"
  }
]
```

**Error Responses**

| Status | Message                       | Cause                   |
| ------ | -------------------------------- | --------------------------- |
| `401`  | `Not authorized, no token`       | Missing token                 |
| `403`  | `Not authorized as an Admin`     | Requester is not Admin        |

---

### `PUT /leaves/:id/status`

Approves or rejects a leave request. On success, a notification is automatically sent to the employee who submitted the request.

- **Auth required:** Yes
- **Admin only:** Yes
- **URL Param:** `id` — MongoDB ObjectId of the leave record

**Request Body**

```json
{
  "status": "Approved"
}
```

| Field    | Type   | Required | Notes                              |
| -------- | ------ | -------- | -------------------------------------- |
| `status` | String | Yes      | Must be `Approved` or `Rejected`       |

**Success — `200 OK`**

```json
{
  "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
  "employeeId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "leaveType": "Casual",
  "startDate": "2024-03-10T00:00:00.000Z",
  "endDate": "2024-03-12T00:00:00.000Z",
  "reason": "Family event",
  "status": "Approved",
  "createdAt": "2024-03-05T11:00:00.000Z",
  "updatedAt": "2024-03-06T09:00:00.000Z"
}
```

**Error Responses**

| Status | Message                       | Cause                                 |
| ------ | -------------------------------- | ----------------------------------------- |
| `400`  | `Invalid status parameter`       | Value is not `Approved` or `Rejected`       |
| `401`  | `Not authorized, no token`       | Missing token                                |
| `403`  | `Not authorized as an Admin`     | Requester is not Admin                       |
| `404`  | `Leave record not found`         | No leave exists with the provided `:id`       |

---

## Notification Endpoints

### `GET /notifications`

Returns the latest 20 notifications for the currently logged-in user, sorted newest first.

- **Auth required:** Yes
- **Admin only:** No

**Success — `200 OK`**

```json
[
  {
    "_id": "64f1a2b3c4d5e6f7a8b9c0g1",
    "recipientId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "message": "New Casual leave request from Jane Smith.",
    "isRead": false,
    "createdAt": "2024-03-05T11:00:00.000Z",
    "updatedAt": "2024-03-05T11:00:00.000Z"
  }
]
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`            | Missing token                  |
| `401`  | `Not authorized, token failed`        | Invalid or expired token        |

---

### `PUT /notifications/mark-all`

Marks all unread notifications as read for the currently logged-in user.

- **Auth required:** Yes
- **Admin only:** No

**Success — `200 OK`**

```json
{
  "success": true
}
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`            | Missing token                  |
| `401`  | `Not authorized, token failed`        | Invalid or expired token        |

---

### `PUT /notifications/:id`

Marks a single notification as read.

- **Auth required:** Yes
- **Admin only:** No
- **URL Param:** `id` — MongoDB ObjectId of the notification

**Success — `200 OK`**

```json
{
  "success": true
}
```

**Error Responses**

| Status | Message                          | Cause                  |
| ------ | ------------------------------------- | -------------------------- |
| `401`  | `Not authorized, no token`            | Missing token                  |
| `401`  | `Not authorized, token failed`        | Invalid or expired token        |

---

# Module Documentation

## Project Structure

```
ems/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Role.js
│   │   ├── Attendance.js
│   │   ├── Leave.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── leaveRoutes.js
│   │   └── notificationRoutes.js
│   └── server.js
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── AdminDashboard.jsx
        │   └── EmployeeDashboard.jsx
        ├── components/
        │   ├── EmployeeDirectory.jsx
        │   ├── AdminAttendance.jsx
        │   ├── AdminLeaveManagement.jsx
        │   ├── EmployeeAttendance.jsx
        │   ├── EmployeeLeave.jsx
        │   ├── NotificationBell.jsx
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

### Employee

| Field        | Type   | Required | Notes                                          |
| ------------ | ------ | -------- | ------------------------------------------------ |
| `name`       | String | Yes      |                                                  |
| `email`      | String | Yes      | Must be unique                                  |
| `password`   | String | Yes      | Stored as bcrypt hash                           |
| `role`       | String | No       | Enum: `Admin`, `Employee`. Default: `Employee`  |
| `department` | String | No       | Default: `Unassigned`                           |
| `createdAt`  | Date   | Auto     | Mongoose timestamp                              |
| `updatedAt`  | Date   | Auto     | Mongoose timestamp                              |

### Department

| Field         | Type   | Required     |
| ------------- | ------ | ------------ |
| `name`        | String | Yes (unique) |
| `description` | String | No           |

### Role

| Field         | Type     | Required     |
| ------------- | -------- | ------------ |
| `name`        | String   | Yes (unique) |
| `permissions` | [String] | No           |

### Attendance

| Field          | Type     | Required | Notes                                              |
| -------------- | -------- | -------- | -------------------------------------------------- |
| `employeeId`   | ObjectId | Yes      | Ref: `Employee`                                    |
| `date`         | Date     | Yes      |                                                    |
| `status`       | String   | Yes      | Enum: `Present`, `Absent`, `Half-Day`, `On Leave`  |
| `checkInTime`  | String   | No       | ISO string, set on first `POST /attendance/mark`   |
| `checkOutTime` | String   | No       | ISO string, set on second `POST /attendance/mark`  |
| `createdAt`    | Date     | Auto     | Mongoose timestamp                                 |
| `updatedAt`    | Date     | Auto     | Mongoose timestamp                                 |

### Leave

| Field        | Type     | Required | Notes                                                        |
| ------------ | -------- | -------- | -------------------------------------------------------------- |
| `employeeId` | ObjectId | Yes      | Ref: `Employee`                                                |
| `leaveType`  | String   | Yes      | Enum: `Sick`, `Casual`, `Annual`                               |
| `startDate`  | Date     | Yes      |                                                                |
| `endDate`    | Date     | Yes      |                                                                |
| `reason`     | String   | Yes      |                                                                |
| `status`     | String   | Auto     | Enum: `Pending`, `Approved`, `Rejected`. Default: `Pending`   |
| `createdAt`  | Date     | Auto     | Mongoose timestamp                                             |
| `updatedAt`  | Date     | Auto     | Mongoose timestamp                                             |

### Notification

| Field         | Type     | Required | Notes               |
| ------------- | -------- | -------- | ------------------- |
| `recipientId` | ObjectId | Yes      | Ref: `Employee`     |
| `message`     | String   | Yes      |                     |
| `isRead`      | Boolean  | Auto     | Default: `false`    |
| `createdAt`   | Date     | Auto     | Mongoose timestamp  |
| `updatedAt`   | Date     | Auto     | Mongoose timestamp  |

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

## Frontend Routes & Dashboards

| Path                        | Component           | Access        |
| --------------------------- | -------------------- | ------------- |
| `/`                         | `Login`              | Public        |
| `/admin-dashboard/:slug`    | `AdminDashboard`     | Admin only    |
| `/employee-dashboard/:slug` | `EmployeeDashboard`  | Employee only |

The `:slug` is generated after login as `{firstName}-{last8charsOfId}` (e.g., `john-a8b9c0d1`). `ProtectedRoute` enforces role-based redirection — accessing the wrong role's URL redirects to the correct dashboard automatically.

### Admin Dashboard Tabs

Switched via the `?tab=` query parameter.

| Tab key      | Label              | Component               | Description                                                                  |
| ------------ | ------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `overview`   | Overview            | _(inline)_                | Stats cards (total employees, pending leaves) + activity chart                |
| `directory`  | Employee Directory  | `EmployeeDirectory`      | Add / edit / delete employees                                                  |
| `attendance` | Time & Attendance   | `AdminAttendance`         | Paginated attendance log with date-range filter and CSV export                |
| `leaves`     | Leave Requests       | `AdminLeaveManagement`   | Approve / reject leave requests with search, status filter, and CSV export    |

### Employee Dashboard Tabs

Switched via the `?tab=` query parameter.

| Tab key      | Label             | Component            | Description                                                |
| ------------ | ------------------ | --------------------- | -------------------------------------------------------------- |
| `overview`   | Overview            | _(inline)_              | Leave balance donut chart + today's attendance status         |
| `attendance` | Time & Attendance   | `EmployeeAttendance`    | Clock in / clock out + personal attendance logbook            |
| `leaves`     | Leave Requests       | `EmployeeLeave`         | Apply for leave + leave history with balance summary cards    |
| `profile`    | Profile             | _(inline)_              | Read-only view of the employee's own profile                  |

### Key Components

**`AdminAttendance`** — Displays all employee attendance records with server-side pagination and optional date-range filtering. An **Export Report** button downloads the current page's visible records as a CSV file (`attendance_report_<date>.csv`) with columns: Employee Name, Email, Department, Date, Clock In, Clock Out, Status.

**`AdminLeaveManagement`** — Lists all leave requests with search (by name, department, or leave type) and status filter tabs (All / Pending / Approved / Rejected). Approve and Reject buttons are shown only for `Pending` requests. An **Export Report** button downloads the filtered results as a CSV file (`leave_report_<date>.csv`) with columns: Employee Name, Department, Leave Type, Start Date, End Date, Total Days, Reason, Status.

**`EmployeeAttendance`** — Displays today's date and a **Clock In / Clock Out** button that calls `POST /attendance/mark`. Button state changes automatically based on today's record — shows "Clock In" if not yet checked in, "Clock Out" if checked in but not checked out, and "Day Completed" (disabled) once checked out. Below the controls, a full logbook table shows the employee's last 90 records.

**`EmployeeLeave`** — Four summary cards show Total, Used, Pending, and Remaining leave days (calculated from `GET /leaves/me` against a 20-day annual allowance). A **Request Leave** button opens an inline form with Leave Type, Start Date, End Date, and Reason fields. Submitting the form first shows a review modal with a summary of the request before final confirmation. A leave history table below shows all past requests with status badges.

**`NotificationBell`** — Mounted in the sidebar of both dashboards. Polls `GET /notifications` every **30 seconds** and displays an unread count badge when there are unread notifications. Clicking the bell opens a dropdown panel (max 20 notifications) showing message text and timestamp. Clicking a notification marks it as read via `PUT /notifications/:id`. A **Mark all as read** link calls `PUT /notifications/mark-all`. Clicking a leave-related notification automatically switches the dashboard to the `leaves` tab.

---

## Leave Balance Logic

Leave balance is computed entirely on the frontend from the data returned by `GET /leaves/me`. There is no separate balance field stored in the database.

| Value     | Calculation                                 |
| --------- | --------------------------------------------- |
| Total     | Fixed constant: **20 days**                    |
| Used      | Sum of days across all `Approved` leaves       |
| Pending   | Sum of days across all `Pending` leaves        |
| Remaining | `Total − Used`                                 |

Day count for any leave record: `Math.ceil((endDate - startDate) / 86400000) + 1`

The frontend also validates on submission — if the requested days exceed `Remaining`, the form is blocked with an "Insufficient Balance" alert before any API call is made.

---

## Notification Flow

Two events automatically create notifications:

**1. Employee applies for leave**

- Trigger: `POST /leaves/apply` succeeds
- Recipients: All employees with `role: "Admin"`
- Message: `New <leaveType> leave request from <employeeName>.`

**2. Admin approves or rejects a leave**

- Trigger: `PUT /leaves/:id/status` succeeds
- Recipient: The employee who submitted the leave request (`leave.employeeId`)
- Message: `Your leave request starting <startDate> was <Approved|Rejected>.`

---

## Role-Based Access Control

| Action                               | Admin | Employee |
| -------------------------------------- | ----- | -------- |
| Login                                  | ✅    | ✅       |
| View own profile                       | ✅    | ✅       |
| View all employees                     | ✅    | ❌       |
| Add / edit / delete employee           | ✅    | ❌       |
| Clock in / clock out                   | ✅    | ✅       |
| View own attendance history            | ✅    | ✅       |
| View all attendance records (admin)    | ✅    | ❌       |
| Export attendance report (CSV)         | ✅    | ❌       |
| Apply for leave                        | ✅    | ✅       |
| View own leave history                 | ✅    | ✅       |
| View all leave requests (admin)        | ✅    | ❌       |
| Approve / reject leave                 | ✅    | ❌       |
| Export leave report (CSV)              | ✅    | ❌       |
| Receive notifications                  | ✅    | ✅       |

---

