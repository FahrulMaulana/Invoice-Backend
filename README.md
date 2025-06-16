# Invoice Manager Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A modern invoicing system built with NestJS, designed to manage clients, invoices, payments, and more.</p>

## Description

Invoice Manager is a full-featured backend service for business invoicing needs. It provides APIs for user authentication, client management, invoice generation with PDF export, payment tracking, and more.

## Features

- 🔐 Authentication and authorization
- 👥 Client management
- 📄 PDF invoice generation
- 📦 Product catalog
- 💰 Payment tracking
- 📧 Email automation
- 🏢 Company profile management

## Detailed Installation Guide

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- PostgreSQL (v12 or higher)
- Git

### Step 1: Clone the Repository

```bash
# Clone the repository
$ git clone https://github.com/yourusername/invoice-manager.git

# Navigate to the project directory
$ cd invoice-manager/Backend
```

### Step 2: Install Dependencies

```bash
# Install all required packages
$ npm install
```

### Step 3: Environment Setup

```bash
# Create environment file from template
$ cp .env.example .env

# Open the file with your preferred editor
$ nano .env  # or use any text editor
```

Configure the following variables in your `.env` file:

```
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/invoice_manager?schema=public"

# JWT Authentication
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1d"

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (if using email features)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@yourdomain.com

# Base URL for logo/image paths in PDF invoices
BASE_URL=http://localhost:3000
```

### Step 4: Database Setup

Ensure your PostgreSQL server is running, then:

```bash
# Apply database migrations
$ npx prisma migrate dev

# Generate Prisma client
$ npx prisma generate
```

### Step 5: Start the Application

```bash
# Development mode
$ npm run start:dev

# Production build
$ npm run build
$ npm run start:prod
```

The application will be available at http://localhost:3000 (or the PORT you configured in .env)

## API Documentation

API documentation is available via Swagger UI at `/api/docs` when the application is running.

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Directory Structure

```
src/
├── common/         # Common utilities, decorators, enums
├── controllers/    # API endpoints
├── dto/            # Data Transfer Objects
├── guards/         # Authentication guards
└── services/       # Business logic
```

## License

This project is [MIT licensed](LICENSE).
