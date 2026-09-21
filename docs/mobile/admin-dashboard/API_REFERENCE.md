# Admin Dashboard API Reference

This document lists all the API endpoints used by the admin dashboard, extracted from the web implementation.

## Base URL

All endpoints are relative to the API base URL and require admin authentication.

**Authorization Header**: `Authorization: Bearer <token>`

---

## Authentication & Session

### Check Admin Status
Check if the current user has admin privileges.

**Endpoint**: `GET /api/admin/check`

**Response**:
```json
{
  "isAdmin": true,
  "adminId": "abc123"
}
```

---

## User Management

### Get New Signups
Retrieve paginated list of pending user signups.

**Endpoint**: `GET /api/admin/GET/new-users`

**Query Parameters**:
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response**:
```json
{
  "users": [
    {
      "_id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "accountType": "Doctor",
      "doctorSpecialty": "Cardiology",
      "medicalLicense": "MD123456",
      "countries": ["USA"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "totalUsers": 100
}
```

---

### Approve Users
Approve one or more pending users.

**Endpoint**: `POST /api/admin/POST/approve-users`

**Request Body**:
```json
{
  "userIds": ["user123", "user456"]
}
```

**Response**:
```json
{
  "success": true,
  "approved": 2,
  "message": "Users approved successfully"
}
```

---

### Deny Users
Deny one or more pending users.

**Endpoint**: `POST /api/admin/POST/deny-users`

**Request Body**:
```json
{
  "userIds": ["user123", "user456"],
  "reason": "Incomplete documentation" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "denied": 2,
  "message": "Users denied successfully"
}
```

---

### Get Existing Users
Retrieve approved/active users.

**Endpoint**: `GET /api/admin/GET/existing-users`

**Query Parameters**:
- `accountType` (string, optional) - Filter by "Doctor", "Triage", or "Evac"
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string, optional) - Search by name or email

**Response**:
```json
{
  "users": [...],
  "totalPages": 10,
  "currentPage": 1
}
```

---

### Get Denied Users
Retrieve denied users.

**Endpoint**: `GET /api/admin/GET/denied-users`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response**:
```json
{
  "users": [
    {
      "_id": "user123",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "deniedAt": "2024-01-01T00:00:00Z",
      "denialReason": "Incomplete verification"
    }
  ],
  "totalPages": 2,
  "currentPage": 1
}
```

---

### Reinstate Denied User
Reinstate a previously denied user.

**Endpoint**: `POST /api/admin/POST/reinstate-user`

**Request Body**:
```json
{
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User reinstated successfully"
}
```

---

### Update User
Update user information.

**Endpoint**: `PUT /api/admin/PUT/update-user`

**Request Body**:
```json
{
  "userId": "user123",
  "updates": {
    "accountType": "Doctor",
    "doctorSpecialty": "Cardiology",
    "countries": ["USA", "Canada"],
    "isActive": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

### Delete User (Permanent)
Permanently delete a user account.

**Endpoint**: `DELETE /api/admin/DELETE/user`

**Request Body**:
```json
{
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User deleted permanently"
}
```

---

### Search Users
Search for users by email or name.

**Endpoint**: `GET /api/admin/GET/search-users`

**Query Parameters**:
- `email` (string, optional) - Search by email
- `name` (string, optional) - Search by name
- `limit` (number, default: 10)

**Response**:
```json
{
  "users": [
    {
      "_id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "accountType": "Doctor"
    }
  ]
}
```

---

## Admin Management

### Get Existing Admins
Retrieve list of all admin users.

**Endpoint**: `GET /api/admin/GET/existing-admins`

**Response**:
```json
{
  "admins": [
    {
      "_id": "admin123",
      "userId": {
        "_id": "user123",
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Add Admin
Grant admin privileges to a user.

**Endpoint**: `POST /api/admin/POST/admin-mgmt-add`

**Request Body**:
```json
{
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin added successfully",
  "admin": { /* admin object */ }
}
```

---

### Remove Admin
Revoke admin privileges from a user.

**Endpoint**: `POST /api/admin/POST/admin-mgmt-remove`

**Request Body**:
```json
{
  "adminId": "admin123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Admin removed successfully"
}
```

---

## User Creation

### Create New User
Create a new Doctor, Triage, or Evac user directly.

**Endpoint**: `POST /api/admin/POST/create-user`

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "accountType": "Doctor",
  "doctorSpecialty": "Cardiology", // Only for doctors
  "medicalLicense": "MD123456", // Only for doctors
  "countries": ["USA"],
  "phoneNumber": "+1234567890" // Optional
}
```

**Response**:
```json
{
  "success": true,
  "user": { /* created user object */ },
  "message": "User created successfully"
}
```

---

## Password Management

### Initiate Password Reset
Send password reset email to a user.

**Endpoint**: `POST /api/admin/POST/initiate-password-reset`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### Get Password Reset History
View password reset history.

**Endpoint**: `GET /api/admin/GET/password-reset-history`

**Query Parameters**:
- `userId` (string, optional) - Filter by user
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response**:
```json
{
  "resets": [
    {
      "userId": "user123",
      "requestedAt": "2024-01-01T00:00:00Z",
      "completed": true,
      "completedAt": "2024-01-01T01:00:00Z"
    }
  ],
  "totalPages": 3,
  "currentPage": 1
}
```

---

## Medical Orders

### Get Medical Orders
Retrieve medical orders with filtering.

**Endpoint**: `GET /api/admin/GET/medical-orders`

**Query Parameters**:
- `status` (string, optional) - Filter by status: "pending", "approved", "completed", "cancelled"
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `startDate` (string, optional) - ISO date string
- `endDate` (string, optional) - ISO date string

**Response**:
```json
{
  "orders": [
    {
      "_id": "order123",
      "patientId": "patient123",
      "doctorId": "doctor123",
      "medications": [...],
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalPages": 15,
  "currentPage": 1,
  "totalOrders": 300
}
```

---

### Export Medical Orders
Export medical orders as CSV or JSON.

**Endpoint**: `GET /api/admin/GET/export-medical-orders`

**Query Parameters**:
- `format` (string) - "csv" or "json"
- `status` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Response**: File download

---

## Notifications

### Send Notification
Send a notification to users.

**Endpoint**: `POST /api/admin/POST/send-notification`

**Request Body**:
```json
{
  "title": "System Maintenance",
  "message": "System will be down for maintenance on...",
  "target": "all", // "all", "doctors", "triage", "evac", or specific userIds array
  "userIds": ["user123", "user456"], // If target is specific users
  "priority": "high", // "low", "medium", "high"
  "scheduledFor": "2024-01-01T00:00:00Z" // Optional, for scheduled notifications
}
```

**Response**:
```json
{
  "success": true,
  "notificationId": "notif123",
  "recipients": 150,
  "message": "Notification sent successfully"
}
```

---

### Get Notification History
Retrieve notification history.

**Endpoint**: `GET /api/admin/GET/notification-history`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response**:
```json
{
  "notifications": [
    {
      "_id": "notif123",
      "title": "System Maintenance",
      "message": "...",
      "target": "all",
      "sentAt": "2024-01-01T00:00:00Z",
      "recipients": 150
    }
  ],
  "totalPages": 5,
  "currentPage": 1
}
```

---

## Statistics & Analytics

### Get User Statistics
Retrieve user statistics and metrics.

**Endpoint**: `GET /api/admin/GET/statistics/users`

**Query Parameters**:
- `startDate` (string, optional) - ISO date string
- `endDate` (string, optional) - ISO date string

**Response**:
```json
{
  "totalUsers": 1000,
  "usersByType": {
    "Doctor": 600,
    "Triage": 300,
    "Evac": 100
  },
  "usersBySpecialty": {
    "Cardiology": 150,
    "Neurology": 100,
    // ...
  },
  "newSignupsThisMonth": 50,
  "activeUsers": 800
}
```

---

### Get Specialty Breakdown
Get detailed specialty statistics.

**Endpoint**: `GET /api/admin/GET/statistics/specialties`

**Response**:
```json
{
  "specialties": [
    {
      "name": "Cardiology",
      "count": 150,
      "percentage": 25
    },
    // ...
  ]
}
```

---

### Get Analytics Data
Get comprehensive analytics data.

**Endpoint**: `GET /api/admin/GET/analytics`

**Query Parameters**:
- `metric` (string) - "engagement", "performance", "usage"
- `startDate` (string, optional)
- `endDate` (string, optional)
- `granularity` (string) - "day", "week", "month"

**Response**:
```json
{
  "metric": "engagement",
  "data": [
    {
      "date": "2024-01-01",
      "value": 1250,
      "change": "+5.2%"
    },
    // ...
  ],
  "summary": {
    "average": 1200,
    "peak": 1500,
    "trend": "increasing"
  }
}
```

---

## Image Storage

### Get Storage Statistics
Retrieve image storage usage statistics.

**Endpoint**: `GET /api/admin/GET/image-storage/stats`

**Response**:
```json
{
  "totalStorage": 5242880000, // bytes
  "usedStorage": 3145728000,
  "availableStorage": 2097152000,
  "imageCount": 5000,
  "storageByType": {
    "patient": 2000000000,
    "medical": 1000000000,
    "other": 145728000
  }
}
```

---

### List Images
List uploaded images with pagination.

**Endpoint**: `GET /api/admin/GET/image-storage/list`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 50)
- `type` (string, optional) - Filter by type
- `userId` (string, optional) - Filter by uploader

**Response**:
```json
{
  "images": [
    {
      "_id": "img123",
      "url": "https://...",
      "type": "patient",
      "uploadedBy": "user123",
      "uploadedAt": "2024-01-01T00:00:00Z",
      "size": 1048576
    }
  ],
  "totalPages": 100,
  "currentPage": 1
}
```

---

### Delete Images
Delete one or more images.

**Endpoint**: `DELETE /api/admin/DELETE/images`

**Request Body**:
```json
{
  "imageIds": ["img123", "img456"]
}
```

**Response**:
```json
{
  "success": true,
  "deleted": 2,
  "freedSpace": 2097152 // bytes
}
```

---

## Patient Intake (Telegram Bot)

### Get Bot Settings
Retrieve telegram bot configuration.

**Endpoint**: `GET /api/admin/GET/telegram-bot/settings`

**Response**:
```json
{
  "isActive": true,
  "botToken": "***hidden***",
  "welcomeMessage": "Welcome to...",
  "autoResponseEnabled": true,
  "allowedCountries": ["USA", "Canada"]
}
```

---

### Update Bot Settings
Update telegram bot configuration.

**Endpoint**: `PUT /api/admin/PUT/telegram-bot/settings`

**Request Body**:
```json
{
  "isActive": true,
  "welcomeMessage": "Welcome to...",
  "autoResponseEnabled": true,
  "allowedCountries": ["USA", "Canada"]
}
```

**Response**:
```json
{
  "success": true,
  "settings": { /* updated settings */ }
}
```

---

### Get Intake Statistics
Retrieve patient intake statistics.

**Endpoint**: `GET /api/admin/GET/telegram-bot/stats`

**Query Parameters**:
- `startDate` (string, optional)
- `endDate` (string, optional)

**Response**:
```json
{
  "totalIntakes": 500,
  "intakesByDay": [...],
  "averageResponseTime": 120, // seconds
  "completionRate": 85.5 // percentage
}
```

---

## Test Data Management

### Clear Test Data
Clear test data from the system (dev/staging only).

**Endpoint**: `POST /api/admin/POST/clear-test-data`

**Request Body**:
```json
{
  "dataTypes": ["users", "patients", "messages", "medicalOrders"],
  "confirmation": "CLEAR_TEST_DATA"
}
```

**Response**:
```json
{
  "success": true,
  "cleared": {
    "users": 50,
    "patients": 100,
    "messages": 500,
    "medicalOrders": 75
  },
  "message": "Test data cleared successfully"
}
```

**Note**: This endpoint should only work in development or staging environments.

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request body",
  "details": { /* validation errors */ }
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

Admin endpoints may be rate limited:
- **Standard endpoints**: 100 requests per minute
- **Bulk operations**: 10 requests per minute
- **Export operations**: 5 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Authentication Flow

1. User logs in via `/api/auth/login`
2. Receive JWT token in response
3. Include token in `Authorization` header for all admin requests
4. Token expires after 24 hours (refresh or re-login)

---

## Best Practices

1. **Always handle errors**: Check response status and handle error cases
2. **Use pagination**: Don't load all data at once
3. **Confirm destructive actions**: Always confirm before delete/deny operations
4. **Cache when possible**: Cache static data like specialty lists
5. **Implement retry logic**: For failed network requests
6. **Show loading states**: Keep users informed during API calls
7. **Validate input**: Validate data before sending to API
8. **Log errors**: Log errors for debugging (but not sensitive data)

---

## Testing

For testing, use the following mock data generator endpoints (dev only):

- `POST /api/dev/generate-test-users` - Generate test users
- `POST /api/dev/generate-test-orders` - Generate test medical orders
- `POST /api/dev/reset-database` - Reset database to clean state

---

**Last Updated**: 2024-01-01
**Version**: 1.0.0