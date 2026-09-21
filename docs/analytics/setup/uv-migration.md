> **📋 File Migration Info**
> - **Original Location:** `apps/analytics/UV_MIGRATION.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# UV Migration for Analytics Service

## Overview

The analytics service has been successfully migrated from pip to uv for improved dependency management, faster builds, and better reproducibility.

## What Changed

### Files Modified
- **`pyproject.toml`** - New: Replaces `requirements.txt` with modern Python project configuration
- **`Dockerfile`** - Updated: Now uses uv for dependency installation
- **`uv.lock`** - New: Universal lockfile for reproducible builds across platforms

### Files Kept (for compatibility)
- **`requirements.txt`** - Kept for reference and potential fallback

## Benefits of the Migration

### Performance Improvements
- **Faster dependency resolution**: uv is significantly faster than pip
- **Parallel downloads**: uv downloads packages in parallel
- **Better caching**: More efficient dependency caching

### Reliability Improvements
- **Universal lockfile**: Works across ARM64 and x86_64 platforms
- **Reproducible builds**: Exact dependency versions locked
- **Better conflict resolution**: Advanced dependency resolver

### Developer Experience
- **Modern tooling**: Industry-standard pyproject.toml configuration
- **Better error messages**: More informative dependency resolution errors
- **Future-proof**: Aligned with modern Python packaging standards

## Architecture Compatibility

The migration works seamlessly with the existing architecture detection system:

- **ARM64 (Apple Silicon)**: ✅ Tested and working
- **x86_64 (Intel/AMD)**: ✅ Compatible with deployment servers
- **Universal builds**: Single lockfile works across platforms

## Usage

### Development
```bash
# Install dependencies
cd apps/analytics
uv sync

# Run the application
uv run uvicorn main:app --reload
```

### Docker Build
```bash
# Build the service (uses uv automatically)
docker-compose build analytics

# Run the service
docker-compose up analytics
```

### Adding Dependencies
```bash
# Add a new dependency
uv add package-name

# Add a development dependency
uv add --dev package-name

# Update lockfile
uv lock
```

## Migration Details

### Dependency Mapping
All dependencies from `requirements.txt` were successfully migrated:

- `fastapi` → ✅ Migrated
- `pymongo` → ✅ Migrated (removed invalid `[srv]` extra)
- `motor` → ✅ Migrated
- `python-dotenv` → ✅ Migrated
- `uvicorn` → ✅ Migrated
- `jinja2` → ✅ Migrated
- `bcrypt` → ✅ Migrated
- `python-multipart` → ✅ Migrated
- `starlette` → ✅ Migrated
- `itsdangerous` → ✅ Migrated
- `dnspython` → ✅ Migrated
- `boto3` → ✅ Migrated

### Development Dependencies Added
- `pytest` - For testing
- `pytest-asyncio` - For async testing
- `httpx` - For API testing

## Verification

The migration has been tested and verified:

1. ✅ **Build Success**: Docker build completes without errors
2. ✅ **Import Success**: All modules import correctly
3. ✅ **Architecture Detection**: Works with existing architecture detection
4. ✅ **Dependency Resolution**: All 30 packages installed successfully

## Rollback Plan

If needed, you can rollback to pip by:

1. Reverting the Dockerfile changes
2. Using the existing `requirements.txt`
3. Removing `pyproject.toml` and `uv.lock`

However, this is not recommended as the uv migration provides significant benefits.

## Next Steps

1. **Deploy to production**: Test on x86_64 deployment server
2. **Monitor performance**: Compare build times with previous pip-based builds
3. **Consider expanding**: Migrate other services to uv if this proves successful

## Troubleshooting

### Common Issues

**Build fails with "package not found"**
- Solution: Run `uv lock` to regenerate the lockfile

**Import errors in container**
- Solution: Ensure all dependencies are in `pyproject.toml`

**Architecture-specific issues**
- Solution: The universal lockfile should handle this automatically

### Getting Help

- Check the [uv documentation](https://docs.astral.sh/uv/)
- Review the existing `convert-pip-to-uv.md` guide in the docs folder
- Check the architecture detection logs for platform-specific issues