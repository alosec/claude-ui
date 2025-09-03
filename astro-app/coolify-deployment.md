# Coolify Deployment Guide for Astro App

## Prerequisites
- Coolify instance running and accessible
- Domain configured (update docker-compose.yml with your domain)
- Server with Docker installed

## Deployment Steps

### 1. Prepare Your Application
The following files have been created for Coolify deployment:
- `Dockerfile` - Multi-stage build optimized for production
- `.dockerignore` - Excludes unnecessary files from build context  
- `docker-compose.yml` - Coolify-compatible service definition

### 2. Update Domain Configuration
Edit `docker-compose.yml` and replace `your-domain.com` with your actual domain:
```yaml
- "traefik.http.routers.astro-app.rule=Host(`your-actual-domain.com`)"
```

### 3. Deploy via Coolify

#### Option A: Git Repository Deployment
1. Push your code to a Git repository
2. In Coolify dashboard, create new project
3. Add service → From Git Repository
4. Configure repository URL and branch
5. Set build command: `docker build -t astro-app .`
6. Set start command: `docker-compose up -d`

#### Option B: Docker Compose Deployment  
1. In Coolify dashboard, create new project
2. Add service → Docker Compose
3. Upload or paste the contents of `docker-compose.yml`
4. Configure environment variables if needed
5. Deploy

### 4. Environment Variables (Optional)
If you need custom environment variables:
- `NODE_ENV=production`
- `HOST=0.0.0.0` 
- `PORT=4321`
- Add any app-specific variables

### 5. Health Check Configuration
The service includes health checks that:
- Test endpoint availability every 30s
- Allow 40s startup time
- Retry 3 times before marking unhealthy
- Use wget to check localhost:4321

### 6. SSL/TLS Configuration
The configuration assumes:
- Traefik proxy with Let's Encrypt
- Automatic SSL certificate generation
- HTTPS redirect enabled

## Verification Steps

1. **Check service status** in Coolify dashboard
2. **Verify health checks** are passing
3. **Test domain access** via HTTPS
4. **Check application logs** for any errors
5. **Verify PWA functionality** if applicable

## Troubleshooting

### Common Issues:
- **Health check failures**: Verify port 4321 is accessible internally
- **Build failures**: Check node_modules are excluded in .dockerignore
- **Domain issues**: Ensure DNS points to your server
- **SSL problems**: Verify domain ownership and DNS propagation

### Debugging Commands:
```bash
# Check container logs
docker logs <container-name>

# Test health check manually
docker exec <container-name> wget --quiet --tries=1 --spider http://localhost:4321/

# Check container status
docker ps
```

## Production Considerations

1. **Resource Requirements**: 
   - Minimum: 512MB RAM, 1 CPU core
   - Recommended: 1GB RAM, 2 CPU cores

2. **Backup Strategy**:
   - Application code in Git repository
   - No persistent data to backup (stateless app)

3. **Monitoring**:
   - Use Coolify's built-in monitoring
   - Consider external monitoring for production

4. **Scaling**:
   - Deploy multiple replicas behind load balancer
   - Use separate servers for high availability

## Security Notes

- Application runs as non-root user (astro:1001)
- No sensitive data in Docker image
- Health checks use internal network only
- HTTPS enforced via Traefik configuration