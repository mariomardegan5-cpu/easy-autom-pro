# Easy-Autom-Pro Deployment Guide

Welcome to the Easy-Autom-Pro setup documentation. This guide provides complete step-by-step instructions for deploying the easy-autom-pro system in your environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Verification and Testing](#verification-and-testing)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)
10. [Maintenance](#maintenance)

---

## Prerequisites

Before deploying easy-autom-pro, ensure you have the following installed on your system:

- **Git** (version 2.25+)
  ```bash
  git --version
  ```

- **Python** (version 3.8 or higher)
  ```bash
  python3 --version
  ```

- **Node.js and npm** (version 14+ / npm 6+)
  ```bash
  node --version
  npm --version
  ```

- **Docker and Docker Compose** (optional, for containerized deployment)
  ```bash
  docker --version
  docker-compose --version
  ```

---

## System Requirements

### Minimum Requirements
- **OS**: Linux, macOS, or Windows (WSL2)
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Disk Space**: 10 GB available

### Recommended Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **CPU**: 4+ cores
- **RAM**: 8 GB+
- **Disk Space**: 20 GB+

---

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/mariomardegan5-cpu/easy-autom-pro.git
cd easy-autom-pro
```

### Step 2: Create a Virtual Environment (Python)

```bash
# On Linux/macOS
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Python Dependencies

```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### Step 4: Install Node.js Dependencies

```bash
npm install
```

### Step 5: Install Development Dependencies (Optional)

For development purposes, install additional dependencies:

```bash
pip install -r requirements-dev.txt
npm install --save-dev
```

---

## Configuration

### Step 1: Environment Variables

Create a `.env` file in the project root directory:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# Application Settings
APP_NAME=easy-autom-pro
APP_ENV=development
APP_DEBUG=True
APP_PORT=8000

# Database Configuration
DB_ENGINE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easy_autom_pro_db
DB_USER=automuser
DB_PASSWORD=your_secure_password_here

# API Configuration
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here
API_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Redis Configuration (if applicable)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Security
SECRET_KEY=your_django_secret_key_here
ALLOWED_HOSTS=localhost,127.0.0.1

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Step 2: Configuration Files

Check for and update any configuration files in the `config/` directory based on your environment:

```bash
ls -la config/
```

---

## Database Setup

### Step 1: Install Database Server

#### PostgreSQL (Recommended)

**On Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**On macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**On Windows:**
Download and install from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

### Step 2: Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Inside PostgreSQL shell, execute:
CREATE USER automuser WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE easy_autom_pro_db OWNER automuser;
ALTER ROLE automuser SET client_encoding TO 'utf8';
ALTER ROLE automuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE automuser SET default_transaction_deferrable TO on;
ALTER ROLE automuser SET default_timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE easy_autom_pro_db TO automuser;
\q
```

### Step 3: Run Database Migrations

```bash
# Activate virtual environment first
source venv/bin/activate  # On Linux/macOS

# Run migrations
python manage.py migrate

# Create superuser for admin panel
python manage.py createsuperuser
```

### Step 4: Load Initial Data (Optional)

```bash
python manage.py loaddata fixtures/initial_data.json
```

---

## Running the Application

### Step 1: Start the Backend Server

```bash
# Activate virtual environment
source venv/bin/activate  # On Linux/macOS

# Run Django development server
python manage.py runserver 0.0.0.0:8000
```

Expected output:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### Step 2: Start the Frontend Development Server (in a new terminal)

```bash
# Navigate to frontend directory if separate
cd frontend  # or wherever frontend code is located

# Install frontend dependencies (if not already done)
npm install

# Start frontend server
npm start
```

Expected output:
```
Compiled successfully!

You can now view easy-autom-pro in the browser.

  Local:            http://localhost:3000
```

### Step 3: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

---

## Verification and Testing

### Step 1: Backend Tests

```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests
python manage.py test

# Run specific test file
python manage.py test tests.test_views

# Run tests with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Step 2: Frontend Tests

```bash
# Run frontend tests
npm test

# Run tests with coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

### Step 3: API Verification

```bash
# Test API connectivity
curl http://localhost:8000/api/health/

# Expected response:
# {"status": "ok", "version": "1.0.0"}
```

### Step 4: Database Connection Check

```bash
# Inside Python shell
python manage.py shell

# In the Python shell:
from django.db import connection
print(connection.ensure_connection())
print("Database connected successfully!")
exit()
```

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
python manage.py runserver 0.0.0.0:8001
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL service status
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart

# Verify credentials in .env file
grep DB_ .env
```

### Issue: Missing Dependencies

```bash
# Reinstall all dependencies
pip install --force-reinstall -r requirements.txt
npm install --force
```

### Issue: Module Not Found

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

### Issue: Frontend Not Loading

```bash
# Clear npm cache
npm cache clean --force

# Reinstall frontend dependencies
rm -rf node_modules package-lock.json
npm install

# Restart frontend server
npm start
```

---

## Production Deployment

### Step 1: Prepare for Production

```bash
# Collect static files
python manage.py collectstatic --noinput

# Run security checks
python manage.py check --deploy

# Minimize frontend bundle
npm run build
```

### Step 2: Environment Configuration

Update `.env` for production:

```env
APP_ENV=production
APP_DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DEBUG=False
```

### Step 3: Use Gunicorn (Production WSGI Server)

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --worker-class sync
```

### Step 4: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/easy-autom-pro`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/easy-autom-pro/staticfiles/;
    }

    location /media/ {
        alias /path/to/easy-autom-pro/media/;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/easy-autom-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: SSL/TLS Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew certificates
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Step 6: Setup Systemd Service

Create `/etc/systemd/system/easy-autom-pro.service`:

```ini
[Unit]
Description=Easy-Autom-Pro Application
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/path/to/easy-autom-pro
Environment="PATH=/path/to/easy-autom-pro/venv/bin"
ExecStart=/path/to/easy-autom-pro/venv/bin/gunicorn \
    config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable easy-autom-pro
sudo systemctl start easy-autom-pro
```

---

## Maintenance

### Regular Backups

```bash
# Backup database
pg_dump -U automuser easy_autom_pro_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup application files
tar -czf easy-autom-pro-backup-$(date +%Y%m%d_%H%M%S).tar.gz /path/to/easy-autom-pro
```

### Log Management

```bash
# View application logs
tail -f logs/app.log

# View system logs
journalctl -u easy-autom-pro -f
```

### Update Dependencies

```bash
# Check for outdated packages
pip list --outdated
npm outdated

# Update Python dependencies
pip install -r requirements.txt --upgrade

# Update Node dependencies
npm update
```

### Database Maintenance

```bash
# Vacuum database
python manage.py shell -c "from django.db import connection; connection.cursor().execute('VACUUM')"

# Analyze database
python manage.py shell -c "from django.db import connection; connection.cursor().execute('ANALYZE')"
```

---

## Additional Resources

- [Official Documentation](https://github.com/mariomardegan5-cpu/easy-autom-pro/wiki)
- [API Reference](docs/API.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [License](LICENSE)

---

## Support

For issues, questions, or feature requests, please:

1. Check existing [GitHub Issues](https://github.com/mariomardegan5-cpu/easy-autom-pro/issues)
2. Create a new issue with detailed information
3. Contact the development team at support@example.com

---

**Last Updated**: 2025-12-10

**Document Version**: 1.0.0

**Maintained By**: Easy-Autom-Pro Development Team
