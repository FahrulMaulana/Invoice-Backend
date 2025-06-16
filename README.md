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

## Installation

```bash
# Install dependencies
$ npm install

# Set up environment variables
$ cp .env.example .env
# Then edit .env with your configuration
```

## Database Setup

This project uses Prisma ORM with PostgreSQL:

```bash
# Apply database migrations
$ npx prisma migrate dev

# Generate Prisma client
$ npx prisma generate
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

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
