# Easy-Autom-Pro Architecture

## Overview

Easy-Autom-Pro is a distributed automation platform designed to orchestrate complex workflows through a modular, scalable architecture. The system comprises four main components: the API Gateway, n8n workflow engine, Redis cache/message broker, and supporting services.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│  (Web UI, Mobile Apps, Third-party Integrations, External APIs)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼──────┐               ┌───────▼─────┐
    │ REST API  │               │  WebSocket  │
    │           │               │  Connection │
    └────┬──────┘               └───────┬─────┘
         │                              │
    ┌────┴──────────────────────────────┴─────┐
    │                                         │
    │      API Gateway (Express.js)           │
    │  ┌─────────────────────────────────┐   │
    │  │ • Request Routing               │   │
    │  │ • Authentication/Authorization  │   │
    │  │ • Input Validation              │   │
    │  │ • Rate Limiting                 │   │
    │  │ • Request/Response Logging      │   │
    │  └─────────────────────────────────┘   │
    └────┬──────────────────────────────────┬─┘
         │                                  │
    ┌────▼────────────────┐      ┌─────────▼────────┐
    │                     │      │                  │
    │  n8n Workflow       │      │  Redis Instance  │
    │  Engine             │      │                  │
    │                     │      │ ┌──────────────┐ │
    │ ┌───────────────┐   │      │ │ Message Queue│ │
    │ │ Workflow       │   │      │ │ & Pub/Sub    │ │
    │ │ Execution      │   │      │ └──────────────┘ │
    │ │ Engine         │   │      │ ┌──────────────┐ │
    │ └───┬───────────┘   │      │ │ Cache Layer  │ │
    │     │               │      │ │ (Hot Data)   │ │
    │ ┌───▼───────────┐   │      │ └──────────────┘ │
    │ │ Node Types    │   │      │ ┌──────────────┐ │
    │ │ • HTTP        │   │      │ │ Session      │ │
    │ │ • Database    │   │      │ │ Management   │ │
    │ │ • Transform   │   │      │ └──────────────┘ │
    │ │ • Custom Logic│   │      │                  │
    │ └───────────────┘   │      └──────────────────┘
    │                     │
    └─────────────────────┘
         │         │
    ┌────▼──┐  ┌──▼──────┐
    │Database│  │ External │
    │        │  │Services  │
    │ • User │  │• Stripe  │
    │ • Flows│  │• SendGrid│
    │ • Logs │  │• Slack   │
    │        │  │• etc.    │
    └────────┘  └──────────┘
```

## Component Details

### 1. API Gateway

**Purpose:** Acts as the single entry point for all client requests, managing routing, authentication, and cross-cutting concerns.

**Key Responsibilities:**
- **Request Routing:** Direct incoming requests to appropriate microservices
- **Authentication & Authorization:** Validate JWT tokens, manage API keys, and enforce role-based access control (RBAC)
- **Input Validation:** Sanitize and validate all incoming data against defined schemas
- **Rate Limiting:** Protect services from abuse through rate limiting per user/IP
- **Logging & Monitoring:** Track all requests for auditing and debugging
- **Error Handling:** Standardize error responses across the platform
- **CORS Management:** Handle cross-origin requests safely

**Technology Stack:**
- Express.js (Node.js)
- Passport.js for authentication
- Express-validator for input validation
- Redis for rate limiting and session management

**Endpoints:**
```
POST   /api/v1/auth/login          - User authentication
POST   /api/v1/auth/logout         - User logout
GET    /api/v1/auth/profile        - Get current user
POST   /api/v1/workflows           - Create new workflow
GET    /api/v1/workflows           - List user workflows
GET    /api/v1/workflows/:id       - Get workflow details
PUT    /api/v1/workflows/:id       - Update workflow
DELETE /api/v1/workflows/:id       - Delete workflow
POST   /api/v1/workflows/:id/run   - Trigger workflow execution
GET    /api/v1/executions/:id      - Get execution details
GET    /api/v1/executions          - List executions
```

### 2. n8n Workflow Engine

**Purpose:** Orchestrates and executes complex, multi-step workflows with various node types and integrations.

**Key Responsibilities:**
- **Workflow Definition & Storage:** Persist workflow configurations and metadata
- **Workflow Execution:** Execute workflows on-demand or on schedule
- **Node Processing:** Execute individual nodes in sequence or parallel
- **Error Handling:** Manage failures with retry logic, error hooks, and alternative paths
- **Integration Management:** Provide connectors to 300+ external services
- **Monitoring & Logging:** Track execution progress and outcomes
- **Scaling:** Execute multiple workflows concurrently

**Core Node Types:**
- **HTTP Node:** Make HTTP requests to external APIs
- **Database Node:** Query and update databases (MySQL, PostgreSQL, MongoDB, etc.)
- **Transform Node:** Data manipulation and mapping
- **Conditional Node:** Branch execution based on conditions
- **Loop Node:** Iterate over arrays
- **Merge Node:** Combine data from multiple branches
- **Custom Code Node:** Execute JavaScript for complex logic
- **Webhook Node:** Receive inbound HTTP requests
- **Schedule Node:** Trigger on cron schedules
- **Email Node:** Send emails
- **Slack/Teams Node:** Send messages to messaging platforms

**Workflow Execution Flow:**
```
1. User/Trigger -> API Gateway
2. Gateway -> Validates & enqueues to Redis
3. n8n Worker -> Picks from queue
4. n8n Worker -> Loads workflow definition
5. n8n Worker -> Executes nodes in order:
   - Node input validation
   - Node execution with context
   - Output mapping
   - Error handling (retry/skip/abort)
6. n8n Worker -> Stores execution logs
7. n8n Worker -> Updates execution status
8. Results -> Cache in Redis
9. Results -> Return to client via Gateway
```

**Configuration:**
- Database: PostgreSQL (for workflow storage)
- Queue System: Built-in queue + Redis integration
- Encryption: Sensitive credentials encrypted at rest

### 3. Redis Cache & Message Broker

**Purpose:** Provides high-performance caching, session management, and asynchronous message processing.

**Key Responsibilities:**
- **Message Queue:** Queue workflow execution requests for asynchronous processing
- **Pub/Sub System:** Enable real-time notifications and event-driven architecture
- **Session Management:** Store user sessions and authentication tokens
- **Caching Layer:** Cache frequently accessed data to reduce database queries
- **Rate Limiting:** Track request counts per user/IP for rate limiting
- **Lock Management:** Prevent concurrent execution of the same workflow

**Data Structures Used:**

```
Queues:
  - workflow:execute:high     - High priority workflow executions
  - workflow:execute:normal   - Normal priority executions
  - workflow:execute:low      - Low priority executions
  
Pub/Sub Channels:
  - workflow:execution:status:{executionId}  - Execution status updates
  - user:notifications:{userId}              - User notifications
  - system:alerts                            - System-wide alerts
  
Cache Keys:
  - workflow:def:{workflowId}                - Workflow definitions
  - user:profile:{userId}                    - User profiles
  - execution:result:{executionId}           - Execution results
  - cache:api:endpoint:{hash}                - API response cache
  
Sessions:
  - session:{sessionId}                      - User session data
  - apikey:{apiKey}                          - API key validation
  
Locks:
  - lock:workflow:{workflowId}               - Workflow execution lock
  - lock:user:{userId}:action                - User action locks
```

**Configuration:**
- Persistence: RDB + AOF (Append-Only File)
- Memory Management: LRU eviction policy
- Replication: Optional Redis Sentinel for HA
- Cluster Support: Redis Cluster for horizontal scaling

### 4. Database Layer

**Purpose:** Persistent storage for all application data.

**Tables:**
```
Users:
  - id, email, password_hash, created_at, updated_at

Workflows:
  - id, user_id, name, description, definition (JSON), 
    is_active, created_at, updated_at

Executions:
  - id, workflow_id, user_id, status, input_data, output_data,
    error_message, started_at, completed_at, duration_ms

Credentials:
  - id, user_id, service, encrypted_data, created_at

Audit Logs:
  - id, user_id, action, resource_type, resource_id, details, 
    created_at, ip_address
```

## Data Flow & Interaction Patterns

### Pattern 1: Synchronous Workflow Execution

```
Client Request
    ↓
API Gateway (validates token, rate limit check)
    ↓
Redis (check lock, acquire lock)
    ↓
n8n Engine (load workflow, execute nodes)
    ↓
External Services (API calls, database queries)
    ↓
n8n Engine (collect results)
    ↓
Redis (store result, publish via Pub/Sub)
    ↓
API Gateway (return response)
    ↓
Client Response
```

### Pattern 2: Asynchronous Workflow Execution

```
Client Request
    ↓
API Gateway (validate & enqueue)
    ↓
Redis Queue (workflow:execute:normal)
    ↓
API Gateway (return execution ID immediately)
    ↓
Client (polls or WebSocket for updates)
    ↓
n8n Worker (picks from queue)
    ↓
n8n Engine (execute workflow)
    ↓
Redis Pub/Sub (publish status updates)
    ↓
API Gateway (forward to WebSocket clients)
    ↓
Client (receives real-time updates)
```

### Pattern 3: Scheduled Workflow Execution

```
Cron Trigger (n8n scheduler)
    ↓
n8n Webhook Node (receives scheduled event)
    ↓
Workflow Execution (same as asynchronous pattern)
```

## Communication Protocols

### REST API
- Standard HTTP/HTTPS for all CRUD operations
- JSON request/response bodies
- Status codes follow REST conventions

### WebSocket
- Real-time bidirectional communication
- Used for:
  - Live execution progress updates
  - Real-time workflow monitoring
  - User notifications

### Redis Pub/Sub
- Internal service communication
- Event broadcasting
- Real-time status updates

## Scalability Considerations

### Horizontal Scaling

**n8n Workers:**
- Multiple n8n instances can process queue jobs
- Share the same database and Redis instance
- Load distribution via queue

**API Gateway:**
- Multiple gateway instances behind a load balancer
- Share Redis sessions and rate limiting state

**Redis:**
- Redis Sentinel for automatic failover
- Redis Cluster for horizontal partitioning

### Vertical Scaling
- Increase CPU/RAM for gateway and n8n instances
- Adjust Redis memory limits
- Increase database connection pool

## Security Architecture

### Authentication & Authorization
- **JWT Tokens:** Issued on login, validated on each request
- **API Keys:** Alternative authentication for service-to-service
- **RBAC:** Role-based access control (Admin, User, Viewer)

### Data Protection
- **Encryption in Transit:** TLS/HTTPS for all communications
- **Encryption at Rest:** Database encryption, encrypted credential storage
- **Password Hashing:** bcrypt with salt rounds
- **Credential Management:** Sensitive data encrypted with master key

### API Security
- Rate limiting per user/IP
- Input validation and sanitization
- CSRF token protection
- CORS policy enforcement

### Audit Trail
- All user actions logged
- Workflow execution history
- Access logs with IP/timestamp
- Admin activity tracking

## Monitoring & Observability

### Metrics
- Request latency and throughput
- Workflow execution success/failure rates
- Queue depth and processing time
- Redis memory usage and eviction rates
- Database query performance

### Logging
- Structured logging with context
- Log aggregation (ELK stack or similar)
- Application, access, and error logs

### Alerting
- Queue backup alerts
- High error rate notifications
- Resource utilization thresholds
- Service health checks

## Deployment Architecture

### Development Environment
```
Local Machine:
  - Express Gateway (port 3000)
  - n8n (port 5678)
  - Redis (port 6379)
  - PostgreSQL (port 5432)
```

### Production Environment
```
Kubernetes Cluster:
  ├── API Gateway Deployment (3+ replicas)
  ├── n8n Worker Deployment (3+ replicas)
  ├── PostgreSQL StatefulSet
  ├── Redis StatefulSet (with Sentinel)
  └── Supporting Services (monitoring, logging)
```

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| **Gateway** | Express.js | 4.x+ |
| **Workflow Engine** | n8n | Latest |
| **Cache/Queue** | Redis | 6.x+ |
| **Database** | PostgreSQL | 13+ |
| **Authentication** | JWT, Passport.js | - |
| **API Documentation** | Swagger/OpenAPI | 3.0 |
| **Container** | Docker | Latest |
| **Orchestration** | Kubernetes | 1.20+ |

## Future Architecture Improvements

1. **GraphQL Support:** Add GraphQL API alongside REST
2. **Event Sourcing:** Implement event sourcing for audit trail
3. **CQRS Pattern:** Separate read and write models for scalability
4. **Service Mesh:** Introduce Istio for advanced traffic management
5. **Serverless Integration:** Support FaaS platforms (Lambda, Cloud Functions)
6. **Multi-Region:** Global deployment with data replication
7. **Advanced Scheduling:** Workflow dependency management and DAG scheduling

## Troubleshooting Guide

### Workflow Execution Fails
1. Check execution logs in database
2. Verify node credentials in Redis cache
3. Check external service connectivity
4. Review rate limiting in Redis

### High Latency
1. Check Redis queue depth
2. Monitor database query performance
3. Verify n8n worker availability
4. Check network bandwidth

### Memory Issues
1. Review Redis eviction policy
2. Check workflow complexity
3. Monitor node execution memory
4. Analyze cache hit rates

---

**Last Updated:** 2025-12-10
**Maintained By:** Easy-Autom-Pro Team
