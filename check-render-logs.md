# How to Check Render Logs for Errors

The API test script shows 500 errors on several endpoints. Here's how to debug:

## 1. Access Render Logs

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service: **smartline-api-pn16**
3. Click on the **Logs** tab

## 2. What to Look For

Search for these error indicators:
- `error`
- `Error:`
- `500`
- `DATABASE_URL`
- `Cannot find module`
- `Connection refused`

## 3. Common Issues and Solutions

### Issue: Database Connection Error
**Error**: `Can't reach database server`
**Solution**: 
- Check if DATABASE_URL is set correctly
- Ensure database is running
- Check if migrations have run

### Issue: Missing Environment Variables
**Error**: `JWT_SECRET is not defined`
**Solution**:
- Go to Environment tab
- Add missing variables:
  ```
  JWT_SECRET=generate-a-random-string-here
  JWT_REFRESH_SECRET=another-random-string-here
  ```

### Issue: Prisma Client Not Generated
**Error**: `Cannot find module '.prisma/client'`
**Solution**:
- The build command should include `npx prisma generate`
- Check if build completed successfully

### Issue: Redis Connection Failed
**Error**: `Redis connection error`
**Solution**:
- Check if Redis service is running
- Verify REDIS_URL is set correctly

## 4. Quick Fixes to Try

1. **Restart the Service**:
   - Click "Manual Deploy" → "Deploy latest commit"

2. **Check Environment Variables**:
   - Ensure all required variables are set
   - No typos or extra spaces

3. **Run Migrations Manually**:
   - Go to Shell tab
   - Run: `npx prisma migrate deploy`

## 5. Required Environment Variables

Make sure these are ALL set in the Environment tab:

```
NODE_ENV=production
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=(auto-set by Render)
REDIS_URL=(auto-set by Render)
```

## 6. Testing After Fixes

Once you've made changes:
1. Wait for the service to redeploy
2. Run the test script again locally
3. Check specific endpoints that were failing

## Need More Help?

- Check the full error stack trace in logs
- Look for the first error that occurs after startup
- Database issues usually cascade into other errors