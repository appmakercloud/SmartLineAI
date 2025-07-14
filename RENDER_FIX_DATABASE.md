# Fix Database Tables on Render

Your database is connected but the tables don't exist. Here's how to fix it:

## Option 1: Quick Fix via Render Shell (Recommended)

1. **Go to Render Dashboard**
   - Navigate to your service: `smartline-api-pn16`
   - Click on the **Shell** tab

2. **Run these commands in order**:
   ```bash
   # First, generate Prisma client
   npx prisma generate

   # Push the schema to create tables
   npx prisma db push

   # Seed initial data (optional but recommended)
   node prisma/seed-plans.js
   ```

3. **Verify tables were created**:
   ```bash
   npx prisma db pull
   ```

## Option 2: Create Migrations (If you have migration files)

If you have existing migrations in your project:

1. In Render Shell, run:
   ```bash
   npx prisma migrate deploy
   ```

2. If no migrations exist, create them first locally:
   ```bash
   # On your local machine
   cd backend
   npx prisma migrate dev --name init
   ```

3. Commit and push the migration files, then redeploy

## Option 3: Update Build Command (Permanent Solution)

Update your render.yaml to automatically run migrations:

1. Go to Render Dashboard → Environment
2. Update the build command or add a new env variable:
   ```
   BUILD_COMMAND=npm install && npx prisma generate && npx prisma db push
   ```

## What These Commands Do:

- `npx prisma generate` - Creates the Prisma Client
- `npx prisma db push` - Creates tables from your schema.prisma
- `npx prisma migrate deploy` - Runs migration files
- `node prisma/seed-plans.js` - Adds subscription plans

## After Running Commands:

1. Test the API again:
   ```bash
   ./test-render-api.sh
   ```

2. You should see successful registration/login responses

## Common Issues:

- **"command not found"**: Make sure you're in the right directory
- **"permission denied"**: The database user might not have CREATE permissions
- **"already exists"**: Tables might be partially created, use `npx prisma db push --force-reset` (WARNING: deletes all data)