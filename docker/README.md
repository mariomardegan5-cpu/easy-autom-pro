# Docker Deployment Guide for Easy-Autom-Pro

This guide provides instructions on how to use Docker and Docker Compose to run the entire easy-autom-pro system.

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 1.29 or higher
- **System Requirements**:
  - Minimum 2GB RAM
  - Minimum 1GB free disk space
  - Linux, macOS, or Windows with WSL2

## Installation

### 1. Install Docker

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS:**
```bash
# Using Homebrew
brew install docker docker-compose
```

**Windows:**
- Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- Ensure WSL2 is enabled

### 2. Verify Installation

```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Navigate to the Project Directory

```bash
cd easy-autom-pro
```

### 2. Build and Start Services

```bash
docker-compose up -d
```

This command will:
- Build Docker images for all services
- Create and start containers in the background
- Create necessary networks and volumes

### 3. Verify Services are Running

```bash
docker-compose ps
```

You should see all services with status "Up".

### 4. Stop Services

```bash
docker-compose down
```

## Service Configuration

### Available Services

The docker-compose.yml typically includes:

- **API Server**: Main application backend
- **Database**: Data persistence layer
- **Cache**: Redis or similar for caching
- **Message Queue**: For async operations (if applicable)
- **Web Interface**: Frontend application (if applicable)

### Environment Variables

Copy the example environment file and customize as needed:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_NAME=easy_autom_pro
DB_USER=admin
DB_PASSWORD=your_secure_password

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false

# Other Services
REDIS_HOST=redis
REDIS_PORT=6379
```

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 50 lines
docker-compose logs --tail 50
```

### Access Service Shells

```bash
# API container
docker-compose exec api bash

# Database container
docker-compose exec db bash
```

### Rebuild Images

```bash
# Rebuild all images
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache api
```

### Database Management

```bash
# Run database migrations
docker-compose exec api python manage.py migrate

# Create database superuser
docker-compose exec api python manage.py createsuperuser

# Database shell
docker-compose exec db psql -U admin -d easy_autom_pro
```

### Clear Data

```bash
# Remove all containers, networks, and volumes
docker-compose down -v

# Warning: This deletes all data. Use with caution!
```

## Accessing the Application

Once services are running, access them at:

- **API Server**: `http://localhost:8000`
- **Web Interface**: `http://localhost:3000` (if applicable)
- **Database**: `localhost:5432`

## Performance Optimization

### 1. Resource Limits

Edit docker-compose.yml to set resource limits:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 2. Volume Optimization

Use named volumes for better performance:

```yaml
volumes:
  db_data:
    driver: local
  cache_data:
    driver: local
```

### 3. Build Optimization

Use .dockerignore to exclude unnecessary files:

```
__pycache__
*.pyc
.git
.env
node_modules
```

## Troubleshooting

### Port Already in Use

If ports are already in use, either:

**Option 1: Stop conflicting services**
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
```

**Option 2: Change ports in docker-compose.yml**
```yaml
ports:
  - "8001:8000"  # Maps 8001 on host to 8000 in container
```

### Memory Issues

Increase Docker memory allocation:

**macOS/Windows (Docker Desktop):**
- Open Docker Desktop settings
- Go to Resources
- Increase Memory slider
- Click Apply & Restart

**Linux:**
- Edit `/etc/docker/daemon.json`:
```json
{
  "memory": 4000000000
}
```
- Restart Docker: `sudo systemctl restart docker`

### Database Connection Errors

```bash
# Check database logs
docker-compose logs db

# Verify database is running
docker-compose exec db pg_isready -U admin
```

### Container Won't Start

```bash
# View detailed error logs
docker-compose logs api

# Rebuild the image
docker-compose build --no-cache api

# Start with verbose output
docker-compose up api
```

## Production Deployment

For production environments:

1. **Use environment-specific compose files:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

2. **Enable restart policies:**
   ```yaml
   services:
     api:
       restart: always
   ```

3. **Set up logging:**
   ```yaml
   services:
     api:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

4. **Use secrets management:**
   - Never commit `.env` files
   - Use Docker secrets for sensitive data
   - Consider external vault solutions (Vault, AWS Secrets Manager)

5. **Regular backups:**
   ```bash
   docker-compose exec db pg_dump -U admin easy_autom_pro > backup.sql
   ```

## Monitoring and Health Checks

### Check Service Health

```bash
docker-compose ps
docker stats
```

### Container Metrics

```bash
# Real-time resource usage
docker stats

# View container details
docker inspect <container_id>
```

## Security Best Practices

1. **Use strong passwords** in `.env` files
2. **Keep Docker updated**: `docker --version`
3. **Scan images for vulnerabilities**: `docker scan <image_name>`
4. **Never run services as root** in production
5. **Use read-only file systems** where possible
6. **Enable authentication** on exposed services
7. **Use private registries** for sensitive images

## Support and Documentation

For additional help:

- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Easy-Autom-Pro Repository](https://github.com/mariomardegan5-cpu/easy-autom-pro)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-10 | Initial Docker documentation |

---

**Last Updated**: 2025-12-10
