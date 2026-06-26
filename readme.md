# Doorcode 3 Backend

Simple Node.js backend for user authentication and protected user routes.

## Features

- User signup and login
- JWT authentication
- Protected routes for users
- Role-based authorization for admin access
- CORS enabled from any origin

## Getting Started

### Requirements

- Node.js 18+ recommended
- MongoDB connection URI

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env` file in the project root with:

```env
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
PORT=5000
```

### Run the app

```bash
npm run dev
```

or

```bash
npm start
```

## API Endpoints

Base URL: `http://localhost:5000`

### Auth

- `POST /api/auth/signup`
  - Body:
    - `firstName`
    - `lastName`
    - `email`
    - `phoneNumber`
    - `password`
    - `role`

- `POST /api/auth/login`
  - Body:
    - `email`
    - `password`

### Users

- `GET /api/users`
  - Requires `Authorization: Bearer <token>`
  - Only accessible by admin users

- `GET /api/users/:userId`
  - Requires `Authorization: Bearer <token>`
  - Accessible by authorized users

### Logs

- `GET /api/logs`
  - Requires `Authorization: Bearer <token>`
  - Only accessible by admin users
  - Returns the latest 50 log entries

- `GET /api/logs/:id`
  - Requires `Authorization: Bearer <token>`
  - Only accessible by admin users
  - Returns a single log entry by its `id`

- `DELETE /api/logs`
  - Requires `Authorization: Bearer <token>`
  - Only accessible by admin users
  - Clears all logs

## Postman

Import `doorcode-3-backend.postman_collection.json` into Postman.

Collection variables:

- `baseUrl`: `http://localhost:5000`
- `token`
- `userId`

Use the `Login` request to store the `token`, then run protected requests with the `Authorization` header.

## Git Ignore

Exclude `node_modules`, `.env`, and editor files from version control.
