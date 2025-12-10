# Troubleshooting Guide - easy-autom-pro

This guide provides solutions to common problems encountered when using the easy-autom-pro system.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Configuration Problems](#configuration-problems)
3. [Runtime Errors](#runtime-errors)
4. [Performance Issues](#performance-issues)
5. [Integration Problems](#integration-problems)
6. [Getting Help](#getting-help)

---

## Installation Issues

### Problem: Dependencies Installation Fails

**Symptoms:**
- Error messages about missing packages during installation
- Installation process hangs or times out

**Solutions:**
1. Ensure you have Python 3.8+ installed:
   ```bash
   python --version
   ```

2. Clear pip cache and try installing again:
   ```bash
   pip cache purge
   pip install -r requirements.txt
   ```

3. Install with verbose output to identify specific issues:
   ```bash
   pip install -r requirements.txt -v
   ```

4. Check internet connection and try using a different PyPI mirror:
   ```bash
   pip install -r requirements.txt -i https://pypi.org/simple/
   ```

### Problem: Virtual Environment Not Activating

**Symptoms:**
- Commands run system Python instead of virtual environment
- Package imports fail

**Solutions:**
1. Ensure virtual environment is created:
   ```bash
   python -m venv venv
   ```

2. Activate the correct environment:
   - **Linux/macOS:** `source venv/bin/activate`
   - **Windows:** `venv\Scripts\activate`

3. Verify activation by checking Python path:
   ```bash
   which python  # Linux/macOS
   where python  # Windows
   ```

---

## Configuration Problems

### Problem: Configuration File Not Found

**Symptoms:**
- Error: "Configuration file not found"
- System fails to start with config-related errors

**Solutions:**
1. Ensure configuration file exists in the correct location:
   ```bash
   ls -la config/  # Linux/macOS
   dir config\    # Windows
   ```

2. Create a sample configuration file:
   ```bash
   cp config/config.example.yml config/config.yml
   ```

3. Update configuration with your settings and validate:
   ```bash
   python -m easy_autom_pro --validate-config
   ```

### Problem: Invalid Configuration Values

**Symptoms:**
- Startup fails with validation errors
- Unexpected behavior despite correct file format

**Solutions:**
1. Check configuration syntax (YAML format):
   ```bash
   python -c "import yaml; yaml.safe_load(open('config/config.yml'))"
   ```

2. Review sample configuration for correct format:
   ```bash
   cat config/config.example.yml
   ```

3. Validate each configuration section individually

4. Check for required vs optional parameters in documentation

### Problem: Environment Variables Not Being Read

**Symptoms:**
- Configuration values default instead of using environment variables
- Error about missing environment variables

**Solutions:**
1. Set environment variables in your shell:
   ```bash
   export AUTOM_API_KEY="your-key"
   export AUTOM_BASE_URL="http://localhost:8000"
   ```

2. Verify variables are set:
   ```bash
   echo $AUTOM_API_KEY
   ```

3. For permanent setup, add to shell profile (~/.bashrc, ~/.zshrc, etc.):
   ```bash
   echo 'export AUTOM_API_KEY="your-key"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. On Windows, use system environment variables or create a .env file and load it

---

## Runtime Errors

### Problem: "Connection Refused" or "Unable to Connect"

**Symptoms:**
- Error connecting to API or database
- "Connection refused" on port XXXX
- Timeouts when making requests

**Solutions:**
1. Verify the target service is running:
   ```bash
   # Check if service is accessible
   curl http://localhost:8000/health
   ```

2. Check network connectivity:
   ```bash
   ping <host>
   netstat -an | grep <port>  # Linux/macOS
   netstat -ano | findstr <port>  # Windows
   ```

3. Verify configuration points to correct host/port:
   ```bash
   cat config/config.yml | grep -A5 "host\|port"
   ```

4. Check firewall settings:
   - Ensure port is not blocked
   - Allow outbound connections if needed

5. Increase timeout values in configuration if service is slow

### Problem: Authentication Failures

**Symptoms:**
- "Authentication failed" or "Invalid credentials"
- 401/403 errors on API calls

**Solutions:**
1. Verify API key/credentials in configuration:
   ```bash
   # Do NOT echo keys in production; check file contents securely
   cat config/config.yml | grep -i "key\|token\|password"
   ```

2. Ensure credentials haven't expired:
   - Check API key expiration date
   - Regenerate keys if necessary

3. Verify correct authentication method is configured:
   - API key authentication
   - OAuth token
   - Username/password

4. Check for special characters in credentials that need escaping

5. Ensure proper permissions for the authenticated user/key

### Problem: Memory Leaks or High Memory Usage

**Symptoms:**
- Process memory grows continuously
- System becomes sluggish after running for a while
- Out of memory errors

**Solutions:**
1. Monitor memory usage:
   ```bash
   # Linux/macOS
   ps aux | grep easy_autom_pro
   
   # Windows
   tasklist | findstr python
   ```

2. Check for resource leaks in logs:
   ```bash
   tail -f logs/easy-autom-pro.log | grep -i "warning\|error"
   ```

3. Restart the service periodically to clear memory:
   ```bash
   systemctl restart easy-autom-pro  # Linux
   ```

4. Limit memory usage if running in containers:
   ```bash
   docker run -m 512m easy-autom-pro
   ```

5. Check for circular dependencies or unclosed connections in custom scripts

---

## Performance Issues

### Problem: Slow Response Times

**Symptoms:**
- Commands take longer than expected to complete
- High latency on API calls
- Progress appears stuck

**Solutions:**
1. Check system resources:
   ```bash
   # CPU and memory usage
   top  # Linux/macOS
   tasklist /v  # Windows
   ```

2. Review performance logs:
   ```bash
   grep -i "duration\|time" logs/easy-autom-pro.log
   ```

3. Optimize configuration:
   - Reduce batch size if processing large amounts of data
   - Increase parallelization if available
   - Adjust timeout values

4. Profile the application:
   ```bash
   python -m cProfile -s cumtime easy_autom_pro_script.py
   ```

5. Check network latency:
   ```bash
   ping <api-host>
   mtr <api-host>  # More detailed network analysis
   ```

### Problem: High CPU Usage

**Symptoms:**
- CPU usage spikes to 100%
- System becomes unresponsive
- Fans running loudly

**Solutions:**
1. Identify which process is consuming CPU:
   ```bash
   top -p $(pgrep -f easy_autom_pro)  # Linux/macOS
   ```

2. Check for infinite loops in logs:
   ```bash
   tail -100 logs/easy-autom-pro.log | grep -i "loop\|retry"
   ```

3. Reduce concurrency settings in configuration

4. Check for background processes or scheduled tasks running simultaneously

5. Update to latest version which may include optimizations:
   ```bash
   pip install --upgrade easy-autom-pro
   ```

---

## Integration Problems

### Problem: Webhook Not Triggering

**Symptoms:**
- Automated workflows don't execute
- Webhook events not received

**Solutions:**
1. Verify webhook is configured:
   ```bash
   cat config/config.yml | grep -A10 "webhook"
   ```

2. Check webhook endpoint is accessible:
   ```bash
   curl -X POST http://localhost:8000/webhook/test
   ```

3. Review webhook logs:
   ```bash
   grep -i "webhook" logs/easy-autom-pro.log
   ```

4. Ensure firewall allows incoming webhook connections

5. Verify source IP/domain is allowed if using IP whitelisting

6. Test webhook manually:
   ```bash
   curl -X POST http://localhost:8000/webhook/event \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### Problem: Data Synchronization Issues

**Symptoms:**
- Data doesn't sync between systems
- Partial or incomplete data transfers
- Sync process hangs

**Solutions:**
1. Check sync status:
   ```bash
   python -m easy_autom_pro --sync-status
   ```

2. Review sync logs:
   ```bash
   tail -50 logs/sync.log
   ```

3. Verify API endpoints are accessible:
   ```bash
   curl http://api-source/health
   curl http://api-destination/health
   ```

4. Check for network connectivity issues:
   ```bash
   traceroute api-source.com  # Linux/macOS
   tracert api-source.com     # Windows
   ```

5. Manually trigger sync with verbose output:
   ```bash
   python -m easy_autom_pro --sync --verbose
   ```

6. Check rate limits on source/destination APIs

---

## Getting Help

### Before Reporting an Issue

1. **Gather Information:**
   - Exact error message and stack trace
   - Steps to reproduce the issue
   - Configuration details (sanitized, no secrets)
   - System information (OS, Python version)
   - Relevant log files

2. **Check Existing Solutions:**
   - Review this troubleshooting guide
   - Search GitHub issues
   - Check documentation

3. **Enable Debug Logging:**
   ```bash
   python -m easy_autom_pro --log-level DEBUG
   ```

### Reporting an Issue

When reporting a bug or issue:

1. Create a GitHub issue with:
   - Clear title describing the problem
   - Detailed reproduction steps
   - Expected vs actual behavior
   - Relevant error messages
   - Logs (with sensitive information removed)

2. Provide system information:
   ```bash
   python --version
   pip show easy-autom-pro
   uname -a  # Linux/macOS
   systeminfo  # Windows
   ```

### Useful Resources

- **Documentation:** See `docs/` directory
- **GitHub Issues:** https://github.com/mariomardegan5-cpu/easy-autom-pro/issues
- **GitHub Discussions:** https://github.com/mariomardegan5-cpu/easy-autom-pro/discussions
- **Community:** Join our community channels for additional support

### Getting Support

- Check the README.md for contact information
- Review API documentation for integration issues
- Submit detailed bug reports with reproduction steps
- Share feature requests and enhancement suggestions

---

## Common Log Messages

### INFO
- `Service started successfully` - Normal operation started
- `Webhook received` - Incoming event processed

### WARNING
- `Retry attempt X of Y` - Temporary failure, attempting recovery
- `Rate limit approaching` - API quota running low

### ERROR
- `Connection timeout` - Network issue, verify connectivity
- `Authentication failed` - Check credentials and permissions
- `Invalid configuration` - Review config file syntax and values

---

## Quick Diagnostic Commands

```bash
# Check system and dependencies
python --version
pip show easy-autom-pro
pip list | grep -i autom

# Test connectivity
curl http://localhost:8000/health -v

# Check logs for errors
grep -i "error" logs/easy-autom-pro.log | tail -20

# Validate configuration
python -c "import yaml; print(yaml.safe_load(open('config/config.yml')))"

# Test authentication
curl -H "Authorization: Bearer $AUTOM_API_KEY" http://localhost:8000/api/test

# Monitor process
ps aux | grep easy_autom_pro
```

---

**Last Updated:** 2025-12-10

For the most current version of this guide, please visit the GitHub repository.
