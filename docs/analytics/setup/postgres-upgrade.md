> **📋 File Migration Info**
> - **Original Location:** `apps/analytics/analytics_postgres_upgrade.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Analytics Service PostgreSQL Upgrade Plan

## Overview

The analytics service is currently a MongoDB-based FastAPI application that provides database viewing and management capabilities. This document outlines the comprehensive plan to migrate it from MongoDB to PostgreSQL to align with the main application's database strategy.

## Current Architecture Analysis

### Current MongoDB Implementation
- **Framework**: FastAPI with Jinja2 templates
- **Database**: MongoDB (via PyMongo/Motor)
- **Features**:
  - Database selection (STAGE/PROD environments)
  - Collection browsing and viewing
  - User authentication
  - Data export/backup functionality
  - System information endpoint
  - Architecture detection

### Current Dependencies
- `pymongo` - MongoDB driver
- `motor` - Async MongoDB driver
- `fastapi`, `uvicorn`, `jinja2` - Web framework
- `bcrypt`, `python-dotenv` - Authentication and config
- `boto3` - S3 backup functionality

## PostgreSQL Migration Plan

### Phase 1: Database Connection and Configuration

#### 1.1 Update Dependencies
```toml
# pyproject.toml updates
[project.dependencies]
# Remove MongoDB dependencies
# pymongo = "*"
# motor = "*"

# Add PostgreSQL dependencies
psycopg2-binary = "*"
sqlalchemy = "*"
asyncpg = "*"  # For async operations
alembic = "*"  # For migrations
```

#### 1.2 Create Database Connection Module
```python
# apps/analytics/db_postgres.py (NEW)
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# PostgreSQL connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/medflow")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

#### 1.3 Update Configuration
```python
# config.py updates
# Add PostgreSQL configuration alongside existing MongoDB config
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgresql://user:password@localhost/medflow")
STAGE_POSTGRES_DB = os.getenv("STAGE_POSTGRES_DB", POSTGRES_DB)
PROD_POSTGRES_DB = os.getenv("PROD_POSTGRES_DB", POSTGRES_DB)
```

### Phase 2: Schema Definition and Models

#### 2.1 Create SQLAlchemy Models
Since the analytics app needs to view all tables, we'll create models that mirror the existing PostgreSQL schemas:

```python
# apps/analytics/models.py (NEW)
from .db_postgres import Base
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Mirror key tables from the web app schemas
class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    firstName = Column(String)
    lastName = Column(String)
    accountType = Column(String)  # Doctor, Triage, etc.
    # ... other fields

class Patient(Base):
    __tablename__ = "patients"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firstName = Column(String)
    lastName = Column(String)
    email = Column(String)
    # ... other fields

# Add more models as needed for common tables
```

#### 2.2 Dynamic Table Reflection
For tables not explicitly modeled, implement dynamic reflection:

```python
# apps/analytics/dynamic_models.py (NEW)
from sqlalchemy import MetaData, Table, inspect
from .db_postgres import engine

metadata = MetaData()

def get_table_model(table_name: str):
    """Dynamically create a model for any table"""
    try:
        metadata.reflect(bind=engine, only=[table_name])
        return metadata.tables.get(table_name)
    except Exception as e:
        logger.error(f"Failed to reflect table {table_name}: {e}")
        return None
```

### Phase 3: API Endpoint Migration

#### 3.1 Update Main Dashboard Endpoint
```python
# main.py updates
@app.get("/")
async def dashboard(request: Request, db: str = Query("prod")):
    if "user" not in request.session:
        return RedirectResponse(url="/login")

    request.session["selected_db"] = db

    try:
        # PostgreSQL: Get table names instead of collection names
        async with async_session() as session:
            # Use SQLAlchemy inspection to get table names
            inspector = inspect(engine)
            table_names = inspector.get_table_names()

        # For copied files (local JSON), keep existing logic
        copied_files = []
        copied_dir = "/app/migrations_temp"
        if os.path.exists(copied_dir):
            copied_files = [f for f in os.listdir(copied_dir) if f.endswith(".json")]

        return templates.TemplateResponse("dashboard.html", {
            "request": request,
            "collections": table_names,  # Rename to tables
            "db": db,
            "copied_files": copied_files
        })

    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        return templates.TemplateResponse("dashboard.html", {
            "request": request,
            "collections": [],
            "db": db,
            "error": "Failed to load database."
        })
```

#### 3.2 Update Collection Viewer Endpoint
```python
# collection/collection.py updates
@router.get("/collection/{collection_name}")
async def view_collection(request: Request, collection_name: str):
    if "user" not in request.session:
        return RedirectResponse(url="/login")

    db_mode = request.session.get("selected_db", "prod")

    try:
        async with async_session() as session:
            # Check if table exists
            inspector = inspect(engine)
            if collection_name not in inspector.get_table_names():
                return {"error": f"Table '{collection_name}' not found."}

            # Get table model dynamically
            table = get_table_model(collection_name)
            if not table:
                return {"error": f"Could not access table '{collection_name}'."}

            # Execute query to get all rows
            stmt = select(table)
            result = await session.execute(stmt)
            rows = result.fetchall()

            # Convert to dict format for template
            data = [dict(row._mapping) for row in rows]

            return templates.TemplateResponse("collection.html", {
                "request": request,
                "collection_name": collection_name,
                "data": data
            })

    except Exception as e:
        logger.error(f"Error accessing table {collection_name}: {e}")
        return {"error": f"Failed to access table '{collection_name}'."}
```

#### 3.3 Update Authentication
The authentication currently uses MongoDB. We need to update it to use PostgreSQL:

```python
# main.py authentication updates
auth_client = create_async_engine(PROD_POSTGRES_DB)
auth_session = sessionmaker(auth_client, class_=AsyncSession)

# Update login function to use PostgreSQL
@app.post("/login")
async def login(request: Request, email: str = Form(...), password: str = Form(...)):
    logger.info(f"Login attempt for email: {email}")

    normalized_email = email.strip().lower()

    try:
        async with auth_session() as session:
            # Query users table
            stmt = select(User).where(func.lower(User.email) == normalized_email)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found for email: {email}")
                return templates.TemplateResponse("login.html", {
                    "request": request,
                    "error": "Invalid credentials"
                })

            # Verify password (assuming password is stored as hashed)
            stored_hashed_password = user.password
            if isinstance(stored_hashed_password, str):
                stored_hashed_password = stored_hashed_password.encode("utf-8")

            if not bcrypt.checkpw(password.encode("utf-8"), stored_hashed_password):
                logger.warning(f"Password mismatch for user {email}")
                return templates.TemplateResponse("login.html", {
                    "request": request,
                    "error": "Invalid credentials"
                })

            logger.info(f"Login successful for {email}")
            request.session["user"] = email

            return RedirectResponse(url="/?db=prod", status_code=302)

    except Exception as e:
        logger.error(f"Database error during login: {e}")
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "Authentication service unavailable"
        })
```

### Phase 4: Backup Functionality Migration

#### 4.1 Update Backup Logic
The current backup system exports MongoDB collections to JSON. For PostgreSQL, we need to:

```python
# main.py backup updates
@app.post("/backup")
async def backup_database(request: Request, backup_db: str = Form("prod")):
    if "user" not in request.session:
        return RedirectResponse(url="/login")

    try:
        # PostgreSQL backup using pg_dump or SQL queries
        import subprocess
        import datetime

        db_url = PROD_POSTGRES_DB if backup_db == "prod" else STAGE_POSTGRES_DB

        # Create backup using pg_dump
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_filename = f"backup-{backup_db}-{timestamp}.sql"

        # Use pg_dump to create backup
        cmd = [
            "pg_dump",
            "--no-owner",
            "--no-privileges",
            "--clean",
            "--if-exists",
            db_url,
            "-f", f"/tmp/{backup_filename}"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"pg_dump failed: {result.stderr}")

        # Upload to S3 (existing logic)
        s3 = boto3.client("s3", ...)
        s3_key = f"database-backups/{backup_filename}"
        s3.upload_file(f"/tmp/{backup_filename}", bucket, s3_key)

        logger.info(f"PostgreSQL backup uploaded to {s3_key}")

    except Exception as e:
        logger.error(f"PostgreSQL backup failed: {e}")
        return {"error": str(e)}

    return RedirectResponse(url=f"/?db={backup_db}", status_code=302)
```

#### 4.2 Update Copy Collection Logic
```python
# main.py copy collection updates
@app.post("/copy_collection")
async def copy_collection(request: Request, collection_to_copy: str = Form(...), db: str = Form("prod")):
    if "user" not in request.session:
        return RedirectResponse(url="/login")

    try:
        async with async_session() as session:
            # Check if table exists
            inspector = inspect(engine)
            if collection_to_copy not in inspector.get_table_names():
                return {"error": f"Table '{collection_to_copy}' not found."}

            # Get table data
            table = get_table_model(collection_to_copy)
            stmt = select(table)
            result = await session.execute(stmt)
            rows = result.fetchall()

            # Convert to JSON
            data = [dict(row._mapping) for row in rows]

            # Save to local file (existing logic)
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            file_name = f"{collection_to_copy}_{timestamp}.json"
            file_path = os.path.join(COPIED_COLLECTIONS_DIR, file_name)

            with open(file_path, "w") as f:
                json.dump(data, f, default=str, indent=2)

            logger.info(f"Copied {len(data)} rows from table {collection_to_copy}")

    except Exception as e:
        logger.error(f"Failed to copy table {collection_to_copy}: {e}")
        return {"error": str(e)}

    return RedirectResponse(url=f"/?db={db}", status_code=302)
```

### Phase 5: Template Updates

#### 5.1 Update Dashboard Template
```html
<!-- templates/dashboard.html updates -->
<h1>PostgreSQL Analytics Dashboard</h1>
<!-- Change "Collections" to "Tables" in UI -->
<h2>Available Tables</h2>
<ul>
{% for table in collections %}
    <li><a href="/collection/{{ table }}">{{ table }}</a></li>
{% endfor %}
</ul>
```

#### 5.2 Update Collection Template
```html
<!-- templates/collection.html updates -->
<h1>Table: {{ collection_name }}</h1>
<p>Total Records: {{ data|length }}</p>
<!-- Update table headers and data display -->
```

### Phase 6: Docker and Deployment Updates

#### 6.1 Update Dockerfile
```dockerfile
# Dockerfile updates
# Remove MongoDB tools installation
# RUN apt-get update && apt-get install -y mongodb-database-tools

# Add PostgreSQL client tools if needed
RUN apt-get update && apt-get install -y postgresql-client

# Update environment variables
ENV POSTGRES_DB=${POSTGRES_DB}
ENV STAGE_POSTGRES_DB=${STAGE_POSTGRES_DB}
ENV PROD_POSTGRES_DB=${PROD_POSTGRES_DB}
```

#### 6.2 Update Docker Compose
```yaml
# docker-compose.services.yml updates
analytics:
  environment:
    # Add PostgreSQL connection strings
    POSTGRES_DB: ${POSTGRES_DB}
    STAGE_POSTGRES_DB: ${STAGE_POSTGRES_DB}
    PROD_POSTGRES_DB: ${PROD_POSTGRES_DB}
    # Keep existing variables
    STAGE_DB: ${STAGE_DB}
    PROD_DB: ${PROD_DB}
```

### Phase 7: Testing and Validation

#### 7.1 Unit Tests
```python
# tests/ (NEW)
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
import json

def test_table_access():
    """Test that PostgreSQL tables are accessible"""
    # Test connection and table listing

def test_data_retrieval():
    """Test data retrieval from PostgreSQL tables"""
    # Test SELECT queries on various tables

def test_authentication():
    """Test user authentication against PostgreSQL"""
    # Test login functionality
```

#### 7.2 Integration Tests
- Test full application startup with PostgreSQL
- Test data viewing functionality
- Test backup and export features
- Test authentication flow

### Phase 8: Migration Script

#### 8.1 Data Migration
If needed, create a migration script to transfer existing MongoDB data to PostgreSQL:

```python
# scripts/migrate_mongo_to_postgres.py (OPTIONAL)
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import create_async_engine

async def migrate_data():
    """Migrate data from MongoDB to PostgreSQL"""
    # Connect to both databases
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    postgres_engine = create_async_engine(POSTGRES_URI)

    # Migrate collections to tables
    # This would be complex and table-specific
    pass
```

## Implementation Timeline

### Week 1: Foundation
- ✅ Update dependencies and configuration
- ✅ Create PostgreSQL connection module
- ✅ Set up basic SQLAlchemy models

### Week 2: Core Migration
- ✅ Update main dashboard endpoint
- ✅ Update collection viewing endpoint
- ✅ Update authentication system

### Week 3: Advanced Features
- ✅ Update backup functionality
- ✅ Update copy/export features
- ✅ Update templates and UI

### Week 4: Testing and Deployment
- ✅ Update Docker configuration
- ✅ Comprehensive testing
- ✅ Production deployment

## Risk Assessment and Mitigation

### High Risk Items
1. **Authentication Migration**: Critical - test thoroughly
2. **Data Export**: Ensure all data types are handled correctly
3. **Performance**: PostgreSQL queries may need optimization

### Mitigation Strategies
- **Dual Support**: Keep MongoDB connection during transition
- **Gradual Rollout**: Test with subset of users first
- **Rollback Plan**: Ability to revert to MongoDB quickly

## Benefits of PostgreSQL Migration

### Performance Improvements
- **ACID Compliance**: Guaranteed data consistency
- **Advanced Querying**: Complex JOINs and aggregations
- **Indexing**: Better performance for large datasets
- **Concurrent Access**: Superior multi-user performance

### Reliability Improvements
- **Data Integrity**: Foreign key constraints and transactions
- **Backup/Restore**: Industry-standard PostgreSQL tools
- **Monitoring**: Rich ecosystem of monitoring tools
- **Scalability**: Better horizontal and vertical scaling

### Developer Experience
- **Type Safety**: Strong typing with SQLAlchemy models
- **Migrations**: Alembic for schema versioning
- **Tooling**: Rich ecosystem of PostgreSQL tools
- **Standards**: SQL standards compliance

### Operational Benefits
- **Backup Strategy**: pg_dump, WAL archiving, point-in-time recovery
- **High Availability**: Streaming replication, failover
- **Security**: Advanced permission system
- **Monitoring**: pg_stat_statements, pgBadger, etc.

## Success Criteria

### Functional Requirements
- [ ] All tables accessible through web interface
- [ ] Authentication works with PostgreSQL
- [ ] Data export/backup functionality preserved
- [ ] System information endpoint functional
- [ ] Architecture detection working

### Performance Requirements
- [ ] Query response times ≤ 2 seconds for typical operations
- [ ] Application startup time ≤ 30 seconds
- [ ] Memory usage within Docker limits
- [ ] Concurrent user support maintained

### Compatibility Requirements
- [ ] All existing URLs and API contracts maintained
- [ ] Template rendering unchanged
- [ ] Session management preserved
- [ ] File upload/download functionality intact

## Rollback Strategy

### Immediate Rollback (First 24 hours)
```bash
# Deploy previous MongoDB version
docker-compose pull analytics:mongo-version
docker-compose up -d analytics
```

### Data Recovery
- PostgreSQL data preserved in separate database
- MongoDB backup available for restoration
- Cross-database sync scripts available if needed

### Gradual Migration
- Support both MongoDB and PostgreSQL connections
- Feature flags to enable/disable PostgreSQL features
- A/B testing between old and new versions

## Conclusion

This PostgreSQL migration will modernize the analytics service while maintaining all existing functionality. The phased approach ensures minimal disruption while providing significant long-term benefits in performance, reliability, and maintainability.

**Estimated Effort**: 4 weeks
**Risk Level**: Medium (with proper testing)
**Business Impact**: High (improved analytics performance and reliability)
