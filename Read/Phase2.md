# Employee Management System (EMS) — Phase 2

Extends the Phase 1 foundation with attendance tracking, leave management, and an in-app notification system for both admins and employees.

---

## Table of Contents

- [What's New in Phase 2](#whats-new-in-phase-2)
- [Updated Project Structure](#updated-project-structure)
- [Database Schemas](#database-schemas)
  - [Leave](#leave)
  - [Notification](#notification)
  - [Attendance (now active)](#attendance-now-active)
- [API Reference](#api-reference)
  - [Attendance Endpoints](#attendance-endpoints)
  - [Leave Endpoints](#leave-endpoints)
  - [Notification Endpoints](#notification-endpoints)
- [Frontend — New Tabs & Components](#frontend--new-tabs--components)
  - [Admin Dashboard Tabs](#admin-dashboard-tabs)
  - [Employee Dashboard Tabs](#employee-dashboard-tabs)
  - [New Components](#new-components)
- [Leave Balance Logic](#leave-balance-logic)
- [Notification Flow](#notification-flow)
- [Updated Role-Based Access Control](#updated-role-based-access-control)

---

## What's New in Phase 2

| Area | Addition |
| ---- | -------- |
| Backend | 3 new route files: `attendanceRoutes.js`, `leaveRoutes.js`, `notificationRoutes.js` |
| Models | 2 new models: `Leave`, `Notification`. `Attendance` model (defined in Phase 1) is now fully active |
| Frontend | 4 new components: `EmployeeAttendance`, `EmployeeLeave`, `AdminAttendance`, `AdminLeaveManagement` |
| Frontend | `NotificationBell` component added to both dashboards |
| Dashboard | Admin dashboard gains **Time & Attendance** and **Leave Requests** tabs |
| Dashboard | Employee dashboard gains **Time & Attendance** and **Leave Requests** tabs |
| Reports | Attendance report with date-range filter + CSV export. Leave report with status filter + CSV export |
| API optimization | Attendance admin endpoint uses server-side pagination and optional date-range filtering |

---

## Updated Project Structure

```
ems/
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Role.js
│   │   ├── Attendance.js          ← now active
│   │   ├── Leave.js               ← new
│   │   └── Notification.js        ← new
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── attendanceRoutes.js    ← new
│   │   ├── leaveRoutes.js         ← new
│   │   └── notificationRoutes.js  ← new
│   └── server.js
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   ├── AdminDashboard.jsx
        │   └── EmployeeDashboard.jsx
        ├── components/
        │   ├── EmployeeDirectory.jsx
        │   ├── AdminAttendance.jsx    ← new
        │   ├── AdminLeaveManagement.jsx ← new
        │   ├── EmployeeAttendance.jsx ← new
        │   ├── EmployeeLeave.jsx      ← new
        │   ├── NotificationBell.jsx   ← new
        │   └── Modals.jsx
        ├── App.jsx
        └── main.jsx
```

---

## Database Schemas

### Leave

| Field        | Type     | Required | Notes                                          |
| ------------ | -------- | -------- | ---------------------------------------------- |
| `employeeId` | ObjectId | Yes      | Ref: `Employee`                                |
| `leaveType`  | String   | Yes      | Enum: `Sick`, `Casual`, `Annual`               |
| `startDate`  | Date     | Yes      |                                                |
| `endDate`    | Date     | Yes      |                                                |
| `reason`     | String   | Yes      |                                                |
| `status`     | String   | Auto     | Enum: `Pending`, `Approved`, `Rejected`. Default: `Pending` |
| `createdAt`  | Date     | Auto     | Mongoose timestamp                             |
| `updatedAt`  | Date     | Auto     | Mongoose timestamp                             |

---

### Notification

| Field         | Type     | Required | Notes                          |
| ------------- | -------- | -------- | ------------------------------ |
| `recipientId` | ObjectId | Yes      | Ref: `Employee`                |
| `message`     | String   | Yes      |                                |
| `isRead`      | Boolean  | Auto     | Default: `false`               |
| `createdAt`   | Date     | Auto     | Mongoose timestamp             |
| `updatedAt`   | Date     | Auto     | Mongoose timestamp             |

---

### Attendance (now active)

Defined in Phase 1. Fully wired to endpoints in Phase 2.

| Field          | Type     | Required | Notes                                             |
| -------------- | -------- | -------- | ------------------------------------------------- |
| `employeeId`   | ObjectId | Yes      | Ref: `Employee`                                   |
| `date`         | Date     | Yes      |                                                   |
| `status`       | String   | Yes      | Enum: `Present`, `Absent`, `Half-Day`, `On Leave` |
| `checkInTime`  | String   | No       | ISO string, set on first `POST /attendance/mark`  |
| `checkOutTime` | String   | No       | ISO string, set on second `POST /attendance/mark` |
| `createdAt`    | Date     | Auto     | Mongoose timestamp                                |
| `updatedAt`    | Date     | Auto     | Mongoose timestamp                                |

---

## API Reference

**Base URL:** `http://localhost:5000/api`

All endpoints require JWT Bearer token authentication unless stated otherwise. See Phase 1 documentation for the authentication header format.

---

### Attendance Endpoints

#### `POST /attendance/mark`

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

| Status | Message                                       | Cause                             |
| ------ | --------------------------------------------- | --------------------------------- |
| `400`  | `You have already checked out for today.`     | Third call on the same day        |
| `401`  | `Not authorized, no token`                    | Missing Authorization header      |
| `401`  | `Not authorized, token failed`                | Invalid or expired token          |

---

#### `GET /attendance/me`

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

| Status | Message                        | Cause                    |
| ------ | ------------------------------ | ------------------------ |
| `401`  | `Not authorized, no token`     | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

#### `GET /attendance`

Returns a paginated list of all employee attendance records. Supports optional date-range filtering. Results are sorted newest first.

- **Auth required:** Yes
- **Admin only:** Yes

**Query Parameters**

| Parameter   | Type   | Required | Default | Notes                                           |
| ----------- | ------ | -------- | ------- | ----------------------------------------------- |
| `page`      | Number | No       | `1`     | Page number                                     |
| `limit`     | Number | No       | `25`    | Records per page                                |
| `startDate` | String | No       | —       | ISO date string. Must be paired with `endDate`  |
| `endDate`   | String | No       | —       | ISO date string. End-of-day time applied server-side |

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

| Status | Message                      | Cause                  |
| ------ | ---------------------------- | ---------------------- |
| `401`  | `Not authorized, no token`   | Missing token          |
| `403`  | `Not authorized as an Admin` | Requester is not Admin |

---

### Leave Endpoints

#### `POST /leaves/apply`

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

| Field       | Type   | Required | Notes                             |
| ----------- | ------ | -------- | --------------------------------- |
| `leaveType` | String | Yes      | Enum: `Sick`, `Casual`, `Annual`  |
| `startDate` | Date   | Yes      | ISO date string                   |
| `endDate`   | Date   | Yes      | ISO date string                   |
| `reason`    | String | Yes      |                                   |

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

| Status | Message                      | Cause                    |
| ------ | ---------------------------- | ------------------------ |
| `400`  | `All fields are required`    | Any field is missing     |
| `401`  | `Not authorized, no token`   | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

#### `GET /leaves/me`

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

| Status | Message                        | Cause                    |
| ------ | ------------------------------ | ------------------------ |
| `401`  | `Not authorized, no token`     | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

#### `GET /leaves`

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

| Status | Message                      | Cause                  |
| ------ | ---------------------------- | ---------------------- |
| `401`  | `Not authorized, no token`   | Missing token          |
| `403`  | `Not authorized as an Admin` | Requester is not Admin |

---

#### `PUT /leaves/:id/status`

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

| Field    | Type   | Required | Notes                            |
| -------- | ------ | -------- | -------------------------------- |
| `status` | String | Yes      | Must be `Approved` or `Rejected` |

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

| Status | Message                      | Cause                                    |
| ------ | ---------------------------- | ---------------------------------------- |
| `400`  | `Invalid status parameter`   | Value is not `Approved` or `Rejected`    |
| `401`  | `Not authorized, no token`   | Missing token                            |
| `403`  | `Not authorized as an Admin` | Requester is not Admin                   |
| `404`  | `Leave record not found`     | No leave exists with the provided `:id`  |

---

### Notification Endpoints

#### `GET /notifications`

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

| Status | Message                        | Cause                    |
| ------ | ------------------------------ | ------------------------ |
| `401`  | `Not authorized, no token`     | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

#### `PUT /notifications/mark-all`

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

| Status | Message                        | Cause                    |
| ------ | ------------------------------ | ------------------------ |
| `401`  | `Not authorized, no token`     | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

#### `PUT /notifications/:id`

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

| Status | Message                        | Cause                    |
| ------ | ------------------------------ | ------------------------ |
| `401`  | `Not authorized, no token`     | Missing token            |
| `401`  | `Not authorized, token failed` | Invalid or expired token |

---

## Frontend — New Tabs & Components

### Admin Dashboard Tabs

The `AdminDashboard` now renders four tabs, switched via `?tab=` query parameter in the URL.

| Tab key      | Label              | Component               | Description                                                  |
| ------------ | ------------------ | ----------------------- | ------------------------------------------------------------ |
| `overview`   | Overview           | _(inline)_              | Stats cards (total employees, pending leaves) + activity chart |
| `directory`  | Employee Directory | `EmployeeDirectory`     | Add / edit / delete employees (Phase 1)                      |
| `attendance` | Time & Attendance  | `AdminAttendance`       | Paginated attendance log with date-range filter and CSV export |
| `leaves`     | Leave Requests     | `AdminLeaveManagement`  | Approve / reject leave requests with search, status filter, and CSV export |

---

### Employee Dashboard Tabs

The `EmployeeDashboard` now renders four tabs, switched via `?tab=` query parameter in the URL.

| Tab key      | Label             | Component            | Description                                               |
| ------------ | ----------------- | -------------------- | --------------------------------------------------------- |
| `overview`   | Overview          | _(inline)_           | Leave balance donut chart + today's attendance status     |
| `attendance` | Time & Attendance | `EmployeeAttendance` | Clock in / clock out + personal attendance logbook        |
| `leaves`     | Leave Requests    | `EmployeeLeave`      | Apply for leave + leave history with balance summary cards |
| `profile`    | Profile           | _(inline)_           | Read-only view of the employee's own profile              |

---

### New Components

#### `AdminAttendance`

Displays all employee attendance records with server-side pagination and optional date-range filtering. An **Export Report** button downloads the current page's visible records as a CSV file (`attendance_report_<date>.csv`) with columns: Employee Name, Email, Department, Date, Clock In, Clock Out, Status.

#### `AdminLeaveManagement`

Lists all leave requests with search (by name, department, or leave type) and status filter tabs (All / Pending / Approved / Rejected). Approve and Reject buttons are shown only for `Pending` requests. An **Export Report** button downloads the filtered results as a CSV file (`leave_report_<date>.csv`) with columns: Employee Name, Department, Leave Type, Start Date, End Date, Total Days, Reason, Status.

#### `EmployeeAttendance`

Displays today's date and a **Clock In / Clock Out** button that calls `POST /attendance/mark`. Button state changes automatically based on today's record — shows "Clock In" if not yet checked in, "Clock Out" if checked in but not checked out, and "Day Completed" (disabled) once checked out. Below the controls, a full logbook table shows the employee's last 90 records.

#### `EmployeeLeave`

Four summary cards show Total, Used, Pending, and Remaining leave days (calculated from `GET /leaves/me` against a 20-day annual allowance). A **Request Leave** button opens an inline form with Leave Type, Start Date, End Date, and Reason fields. Submitting the form first shows a review modal with a summary of the request before final confirmation. A leave history table below shows all past requests with status badges.

#### `NotificationBell`

Mounted in the sidebar of both dashboards. Polls `GET /notifications` every **30 seconds** and displays an unread count badge when there are unread notifications. Clicking the bell opens a dropdown panel (max 20 notifications) showing message text and timestamp. Clicking a notification marks it as read via `PUT /notifications/:id`. A **Mark all as read** link calls `PUT /notifications/mark-all`. Clicking a leave-related notification automatically switches the dashboard to the `leaves` tab.

---

## Leave Balance Logic

Leave balance is computed entirely on the frontend from the data returned by `GET /leaves/me`. There is no separate balance field stored in the database.

| Value       | Calculation                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| Total       | Fixed constant: **20 days**                                                 |
| Used        | Sum of days across all `Approved` leaves                                    |
| Pending     | Sum of days across all `Pending` leaves                                     |
| Remaining   | `Total − Used`                                                              |

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

## Updated Role-Based Access Control

| Action                              | Admin | Employee |
| ----------------------------------- | ----- | -------- |
| Login                               | ✅    | ✅       |
| View own profile                    | ✅    | ✅       |
| View all employees                  | ✅    | ❌       |
| Add / edit / delete employee        | ✅    | ❌       |
| Clock in / clock out                | ✅    | ✅       |
| View own attendance history         | ✅    | ✅       |
| View all attendance records (admin) | ✅    | ❌       |
| Export attendance report (CSV)      | ✅    | ❌       |
| Apply for leave                     | ✅    | ✅       |
| View own leave history              | ✅    | ✅       |
| View all leave requests (admin)     | ✅    | ❌       |
| Approve / reject leave              | ✅    | ❌       |
| Export leave report (CSV)           | ✅    | ❌       |
| Receive notifications               | ✅    | ✅       |