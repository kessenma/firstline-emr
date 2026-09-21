> **📋 File Migration Info**
> - **Original Location:** `apps/docs/livekit/DEPLOYMENT_CHECKLIST.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Deployment Checklist

Use this checklist when deploying LiveKit to production with Coolify.

## Pre-Deployment

### 1. Domain and DNS
- [ ] Register domain for LiveKit (e.g., `call.dev.emr.fajrscientific.org`)
- [ ] Configure DNS A record pointing to your server IP
- [ ] (Optional) Register separate TURN domain if needed
- [ ] Verify DNS propagation: `nslookup call.dev.emr.fajrscientific.org`

### 2. SSL Certificates
- [ ] Obtain SSL certificate for LiveKit domain
- [ ] Verify certificate is valid and trusted
- [ ] Configure certificate in Coolify/Caddy
- [ ] Test HTTPS access: `curl https://call.dev.emr.fajrscientific.org`

### 3. Generate API Credentials
- [ ] Generate secure API key: `openssl rand -base64 32`
- [ ] Generate secure API secret: `openssl rand -base64 32`
- [ ] Store credentials securely (password manager, secrets vault)
- [ ] Never commit credentials to version control

### 4. Network Configuration
- [ ] Open TCP port 7880 (HTTP/WebSocket)
- [ ] Open TCP port 443 (TURN/TLS)
- [ ] Open UDP ports 50000-60000 (media traffic)
- [ ] Configure security groups/firewall rules
- [ ] Verify external IP is accessible

## Coolify Setup

### 5. Create LiveKit App
- [ ] Create new app in Coolify
- [ ] Name: `livekit-server` or similar
- [ ] Set Docker Compose file: `docker-compose.video.yml`
- [ ] Configure domain: `call.dev.emr.fajrscientific.org`
- [ ] Enable SSL/TLS

### 6. Configure Environment Variables
Add these environment variables in Coolify:

- [ ] `LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `LIVEKIT_API_KEY=<your_generated_key>`
- [ ] `LIVEKIT_API_SECRET=<your_generated_secret>`
- [ ] `LIVEKIT_PORT=7880`
- [ ] `LIVEKIT_TURN_DOMAIN=call.dev.emr.fajrscientific.org`
- [ ] `NODE_ENV=production`

### 7. Update Web App Configuration
Update environment variables in your web app (Coolify):

- [ ] `LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `LIVEKIT_API_KEY=<same_as_livekit_server>`
- [ ] `LIVEKIT_API_SECRET=<same_as_livekit_server>`

### 8. Deploy
- [ ] Deploy LiveKit app in Coolify
- [ ] Wait for build to complete
- [ ] Check deployment logs for errors
- [ ] Verify container is running

## Post-Deployment Testing

### 9. Verify Server is Running
- [ ] Check health endpoint: `curl https://call.dev.emr.fajrscientific.org/`
- [ ] Verify WebSocket connection in browser console
- [ ] Check Docker logs in Coolify

### 10. Test Token Generation
```bash
# Install LiveKit CLI
brew install livekit

# Test token generation
lk token create \
  --api-key <your_api_key> \
  --api-secret <your_api_secret> \
  --join --room test-room \
  --identity test-user \
  --valid-for 1h
```

- [ ] Token generation succeeds
- [ ] Token is valid JWT format

### 11. Test Video Call
- [ ] Navigate to: `https://your-app.com/video?room=test&user=doctor1`
- [ ] Allow camera/microphone permissions
- [ ] Verify video/audio preview appears
- [ ] Open second browser tab with different user
- [ ] Verify both participants can see/hear each other
- [ ] Test on different devices (mobile, tablet)
- [ ] Test on different networks (WiFi, mobile data)

### 12. Test Connectivity
- [ ] Test from office network
- [ ] Test from mobile network
- [ ] Test from restrictive network (corporate firewall)
- [ ] Verify TURN server works (check browser console)
- [ ] Test with VPN enabled

### 13. Performance Testing
- [ ] Test with 2 participants
- [ ] Test with 5 participants
- [ ] Test with 10 participants
- [ ] Monitor CPU usage on server
- [ ] Monitor memory usage on server
- [ ] Monitor network bandwidth
- [ ] Check for audio/video quality issues

## Monitoring Setup

### 14. Configure Monitoring
- [ ] Set up health check monitoring
- [ ] Configure alerts for downtime
- [ ] Set up log aggregation
- [ ] (Optional) Enable Prometheus metrics
- [ ] Configure resource usage alerts

### 15. Logging
- [ ] Verify logs are accessible in Coolify
- [ ] Set appropriate log level (info for production)
- [ ] Configure log rotation
- [ ] Set up log retention policy

## Security Hardening

### 16. Security Review
- [ ] Verify API keys are not exposed in client code
- [ ] Check that tokens are generated server-side only
- [ ] Verify SSL/TLS is enforced
- [ ] Review firewall rules
- [ ] Ensure no unnecessary ports are open
- [ ] Verify TURN authentication is enabled

### 17. Access Control
- [ ] Implement room access control in web app
- [ ] Add user authentication checks
- [ ] Set token expiration (< 24 hours)
- [ ] Implement rate limiting on token generation

## Documentation

### 18. Document Configuration
- [ ] Document all environment variables
- [ ] Document firewall rules
- [ ] Document domain configuration
- [ ] Create runbook for common issues
- [ ] Document scaling procedures

### 19. Team Training
- [ ] Train team on video call features
- [ ] Document troubleshooting steps
- [ ] Create user guide for video calls
- [ ] Document emergency procedures

## Backup and Recovery

### 20. Backup Plan
- [ ] Document configuration backup procedure
- [ ] Test recovery from backup
- [ ] Document rollback procedure
- [ ] Create disaster recovery plan

## Production Readiness

### 21. Final Checks
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] Security review complete
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Backup plan in place

### 22. Go Live
- [ ] Schedule deployment window
- [ ] Notify users of new feature
- [ ] Monitor closely for first 24 hours
- [ ] Be ready to rollback if needed

## Post-Launch

### 23. Monitor and Optimize
- [ ] Review logs daily for first week
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Optimize configuration as needed
- [ ] Plan for scaling if needed

## Troubleshooting Reference

### Common Issues

**Connection fails:**
- Check firewall rules
- Verify DNS resolution
- Check SSL certificate
- Review server logs

**No audio/video:**
- Check UDP ports 50000-60000
- Verify TURN server configuration
- Test with different network
- Check browser permissions

**High latency:**
- Check server resources
- Verify network bandwidth
- Consider enabling TURN/UDP on 443
- Check for packet loss

**Token errors:**
- Verify API key/secret match
- Check token expiration
- Verify token format
- Review server logs

## Support Contacts

- LiveKit Documentation: https://docs.livekit.io/
- LiveKit Community: https://livekit.io/community
- Internal Team: [Add your team contacts]

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Sign-off:** _____________
