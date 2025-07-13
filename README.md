# SmartLine AI Backend

## Overview
Backend API service for SmartLine AI - A virtual phone system with intelligent features.

## Tech Stack
- Node.js with Express
- PostgreSQL database
- Redis for caching
- Prisma ORM
- JWT authentication

## Features
- Virtual phone number management
- Call handling and routing
- SMS/MMS messaging
- User authentication
- Real-time updates via WebSocket

## Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (copy `.env.example` to `.env`)
4. Run database migrations: `npx prisma migrate deploy`
5. Start the server: `npm start`

## Development
- Run in development mode: `npm run dev`
- Run tests: `npm test`
- Lint code: `npm run lint`

## Deployment
The backend is automatically deployed via GitHub Actions when changes are pushed to the main branch.