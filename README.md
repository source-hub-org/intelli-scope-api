# IntelliScope API

A modern, secure, and scalable RESTful API built with NestJS, MongoDB, and TypeScript that provides AI-powered project analysis, feature generation, and smart estimation for streamlined development.

## About IntelliScope

IntelliScope is an intelligent project management and development assistant designed to revolutionize how software teams plan, estimate, and execute projects. By leveraging advanced AI algorithms, IntelliScope analyzes project requirements, generates detailed feature specifications, provides accurate time estimations, and offers optimization suggestions throughout the development lifecycle.

### Target Audience

- **Development Teams**: Streamline workflow and improve estimation accuracy
- **Project Managers**: Get data-driven insights for better resource allocation and planning
- **Product Owners**: Translate business requirements into technical specifications more efficiently
- **CTOs & Technical Leaders**: Optimize development processes and improve code quality

## Features

### Core AI Features

- **AI-Powered Project Analysis**: Intelligent analysis of project requirements and codebase to identify patterns, dependencies, and potential issues
- **Automated Feature Generation**: AI-driven generation of feature specifications and implementation suggestions based on project requirements
- **Smart Estimation**: Accurate time and resource estimation for development tasks using machine learning algorithms
- **Development Workflow Optimization**: Recommendations for streamlining development processes based on project-specific patterns
- **Code Quality Analysis**: Automated assessment of code quality with actionable improvement suggestions

### Technical Features

- **Authentication & Authorization**: JWT-based authentication with access and refresh tokens
- **User Management**: Complete user management system
- **Activity Logging**: Track user activities and system events
- **Internationalization (i18n)**: Multi-language support
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Implements best practices with Helmet, CORS, and more
- **Database**: MongoDB integration with Mongoose ODM
- **Configuration**: Environment-based configuration

## Tech Stack

### Core Technologies

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: MongoDB
- **Documentation**: Swagger/OpenAPI
- **Authentication**: Passport, JWT
- **Validation**: class-validator, class-transformer
- **Internationalization**: nestjs-i18n
- **Security**: Helmet, compression

### AI & Machine Learning

- **Natural Language Processing**: For requirement analysis and feature generation
- **Machine Learning Models**: For smart estimation and pattern recognition
- **Predictive Analytics**: For resource allocation and timeline forecasting
- **Code Analysis Tools**: For code quality assessment and optimization suggestions

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- MongoDB (local or remote)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/intelli-scope-api.git
   cd intelli-scope-api
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration.

### Running the Application

#### Development mode:

```bash
npm run start:dev
```

#### Production mode:

```bash
npm run build
npm run start:prod
```

#### Debug mode:

```bash
npm run start:debug
```

### API Documentation

When running in development mode, Swagger documentation is available at:

```
http://localhost:3000/docs
```

## Available Scripts

- `npm run build`: Build the application
- `npm run format`: Format code with Prettier
- `npm run start`: Start the application
- `npm run start:dev`: Start in development mode with hot-reload
- `npm run start:debug`: Start in debug mode
- `npm run start:prod`: Start in production mode
- `npm run lint`: Lint the code
- `npm run test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:cov`: Run tests with coverage
- `npm run test:e2e`: Run end-to-end tests
- `npm run docs`: Start Mintlify documentation server

## Project Structure

```
src/
├── activity-log/     # Activity logging module
├── ai/
│   ├── analysis/     # AI-powered project analysis
│   ├── estimation/   # Smart estimation algorithms
│   ├── generation/   # Feature generation capabilities
│   └── models/       # Machine learning models
├── auth/             # Authentication module
├── common/           # Shared utilities, pipes, filters, etc.
├── i18n/             # Internationalization files
├── projects/         # Project management module
├── users/            # User management module
├── app.controller.ts # Main application controller
├── app.module.ts     # Main application module
├── app.service.ts    # Main application service
└── main.ts           # Application entry point
```

## Environment Variables

| Variable                    | Description                                  | Default     |
| --------------------------- | -------------------------------------------- | ----------- |
| PORT                        | Application port                             | 3000        |
| NODE_ENV                    | Environment (development/production)         | development |
| MONGODB_URI                 | MongoDB connection string                    | -           |
| DEFAULT_LANGUAGE            | Default language for i18n                    | en          |
| JWT_ACCESS_SECRET           | Secret for JWT access tokens                 | -           |
| JWT_REFRESH_SECRET          | Secret for JWT refresh tokens                | -           |
| JWT_ACCESS_EXPIRATION_TIME  | Expiration time for access tokens (seconds)  | 3600        |
| JWT_REFRESH_EXPIRATION_TIME | Expiration time for refresh tokens (seconds) | 604800      |
| CORS_ORIGIN                 | CORS origin setting                          | \*          |
| API_PREFIX                  | API route prefix                             | api         |

## License

This project is licensed under the [UNLICENSED](LICENSE) license.
