# Docker Setup Instructions

## Quick Start

1. **Build and start all services:**

   ```bash
   docker-compose up --build -d
   ```

2. **Access the application:**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000
   - Database: PostgreSQL on Railway (remote)

3. **Create admin user (first time only):**
   ```bash
   docker-compose exec backend python scripts/createAdmin.py
   ```
   - Username: `admin`
   - Password: `admin123`

## Other Available Scripts

Run these commands from the project root directory:

```bash
# Create test users
docker-compose exec backend python scripts/createTestUsers.py

# Create test data
docker-compose exec backend python scripts/createTestData.py

# Fix dashboard view
docker-compose exec backend python scripts/fix_dashboard_view.py
```

## Useful Commands

**Stop all services:**

```bash
docker-compose down
```

**Stop and remove volumes (reset database):**

> **Warning:** This will delete all data from the Railway database that was created through the app.

```bash
docker-compose down -v
```

**View logs:**

```bash
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

**Rebuild specific service:**

```bash
docker-compose up --build backend
docker-compose up --build frontend
```

**Execute commands in containers:**

```bash
# Access backend shell
docker-compose exec backend sh

# Access backend Python shell
docker-compose exec backend python
```

## Notes

- **Backend**: Python 3.11 + FastAPI + Uvicorn
- **Frontend**: Node.js 20 + React + Vite  
- **Database**: PostgreSQL hosted on Railway (remote connection)
  - Connection details are configured in `docker-compose.yml`
  - No local database container is used
- Backend hot-reloads on code changes (volume mounted)
- Frontend hot-reloads on code changes (volume mounted)
- Uploaded files persist in Docker volume `uploads_data`

## Environment Variables

The environment variables are configured directly in `docker-compose.yml`:

**Backend:**
- `JWT_SECRET`: JWT token secret key
- `DB_HOST`: Railway PostgreSQL host
- `DB_USER`: postgres
- `DB_PASSWORD`: Railway database password
- `DB_NAME`: railway
- `DB_PORT`: 33101
- `PORT`: 4000

**Frontend:**
- `VITE_API_URL`: http://localhost:4000

## Troubleshooting

**Services not starting:**
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs
```

**Database connection issues:**
- Verify Railway database is accessible
- Check environment variables in `docker-compose.yml`
- Ensure Railway database credentials are correct

**Port already in use:**
- Make sure ports 4000 and 5173 are not being used by other applications
- Stop the containers and try again: `docker-compose down && docker-compose up -d`
