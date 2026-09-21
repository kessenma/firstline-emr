> **📋 File Migration Info**
> - **Original Location:** `apps/analytics/ARCHITECTURE_DETECTION.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Architecture Detection in Analytics App

## Overview

The analytics application now includes automatic architecture detection to help with debugging, monitoring, and potential architecture-specific optimizations.

## Features

### 1. System Architecture Detection
- Automatically detects the system architecture on startup
- Normalizes architecture names (e.g., `aarch64` → `arm64`, `x86_64` → `amd64`)
- Logs detailed system information during startup

### 2. Architecture-Specific Configuration
- Provides different configurations based on detected architecture
- Optimizes resource usage for different platforms

### 3. API Endpoint for System Information
- `/system-info` endpoint provides real-time system information
- Requires authentication
- Returns architecture details and environment configuration

## Architecture Support

### Supported Architectures
- **amd64** (x86_64): Intel/AMD 64-bit processors
- **arm64** (aarch64): ARM 64-bit processors (Apple Silicon, ARM servers)
- **arm32** (armv7l, armv6l): ARM 32-bit processors

### Architecture-Specific Settings

#### AMD64 (x86_64)
```json
{
  "max_workers": 4,
  "memory_limit": "2G",
  "optimization_level": "high"
}
```

#### ARM64 (aarch64)
```json
{
  "max_workers": 2,
  "memory_limit": "1G",
  "optimization_level": "medium"
}
```

#### ARM32 (armv7l/armv6l)
```json
{
  "max_workers": 1,
  "memory_limit": "512M",
  "optimization_level": "low"
}
```

## Usage

### Accessing System Information

1. **Via Logs**: Architecture information is logged during startup
2. **Via API**: Access `/system-info` endpoint after authentication
3. **Via Code**: Import `SYSTEM_INFO` from `main.py` or `SYSTEM_ARCH` from `config.py`

### Example API Response
```json
{
  "system_info": {
    "platform": "Linux-6.10.14-linuxkit-aarch64-with-glibc2.41",
    "machine": "aarch64",
    "processor": "",
    "system_arch": "aarch64",
    "normalized_arch": "arm64",
    "is_x86_64": false,
    "is_arm64": true
  },
  "environment": {
    "stage_db_configured": true,
    "prod_db_configured": true,
    "object_storage_configured": false
  },
  "timestamp": "2025-01-07T10:30:00.000000"
}
```

## Benefits

### For Development
- **Debugging**: Easily identify which architecture is running
- **Testing**: Verify behavior across different architectures
- **Optimization**: Apply architecture-specific optimizations

### For Deployment
- **Monitoring**: Track which architectures are in use
- **Resource Planning**: Adjust resources based on architecture capabilities
- **Troubleshooting**: Quickly identify architecture-related issues

### For Operations
- **Environment Validation**: Confirm correct architecture deployment
- **Performance Tuning**: Apply appropriate settings for each architecture
- **Capacity Planning**: Understand resource requirements per architecture

## Implementation Details

### Detection Method
1. Uses `uname -m` command when available
2. Falls back to Python's `platform.machine()`
3. Normalizes architecture names using a mapping table
4. Provides boolean flags for common architectures

### Configuration Loading
- Architecture-specific configs are loaded from `config.py`
- Default to amd64 configuration if architecture is unknown
- Can be extended for new architectures as needed

## Future Enhancements

### Potential Features
- **Performance Monitoring**: Track performance metrics by architecture
- **Auto-scaling**: Adjust worker counts based on architecture capabilities
- **Feature Flags**: Enable/disable features based on architecture
- **Resource Optimization**: Dynamic memory and CPU allocation

### Architecture-Specific Optimizations
- **Database Connections**: Optimize connection pools per architecture
- **Caching Strategies**: Adjust cache sizes based on available memory
- **Processing Algorithms**: Use architecture-optimized algorithms
- **Monitoring Intervals**: Adjust based on processing capabilities

## Troubleshooting

### Common Issues
1. **Unknown Architecture**: Check logs for detection errors
2. **Performance Issues**: Verify architecture-specific settings
3. **Resource Constraints**: Adjust limits in `config.py`

### Debugging Steps
1. Check startup logs for architecture detection
2. Access `/system-info` endpoint for current status
3. Verify environment variables are set correctly
4. Test with different architecture configurations