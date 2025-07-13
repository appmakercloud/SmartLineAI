# GitHub Auto-Deployment Setup

This guide will help you set up automatic deployment to your Ubuntu server whenever you push code to GitHub.

## Prerequisites

1. Your backend code is pushed to GitHub
2. Your server is already set up and running
3. You have SSH access to your server

## Step 1: Generate SSH Key (if you don't have one)

On your local machine:
```bash
ssh-keygen -t ed25519 -C "github-actions"
# Save it to a specific file like: ~/.ssh/github_actions_key
# Don't add a passphrase
```

## Step 2: Add SSH Key to Server

Copy the public key to your server:
```bash
ssh-copy-id -i ~/.ssh/github_actions_key.pub flickmax@216.70.74.232
```

Or manually add it:
```bash
# On your local machine, copy the public key
cat ~/.ssh/github_actions_key.pub

# SSH to your server
ssh flickmax@216.70.74.232

# Add the key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

## Step 3: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

### Required Secrets:

#### HOST
- Value: `216.70.74.232`
- Your server's IP address

#### USERNAME  
- Value: `flickmax`
- Your SSH username

#### SSH_KEY
- Value: Contents of your private key
- Get it with: `cat ~/.ssh/github_actions_key`
- Copy the entire content including:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```

#### PORT (optional)
- Value: `22`
- Only needed if using non-standard SSH port

## Step 4: Update Server Permissions

SSH to your server and run:
```bash
sudo chown -R flickmax:flickmax /var/www/smartline-api
sudo chmod -R 755 /var/www/smartline-api

# Add flickmax to www-data group
sudo usermod -a -G www-data flickmax

# Allow flickmax to run pm2 commands
sudo visudo
# Add this line:
# flickmax ALL=(ALL) NOPASSWD: /usr/bin/pm2
```

## Step 5: Initialize Git on Server

```bash
cd /var/www/smartline-api/SmartLineAI
git remote add origin https://github.com/YOUR_USERNAME/SmartLineAI.git
git branch --set-upstream-to=origin/main main
```

## How It Works

When you push to the `main` or `master` branch:
1. GitHub Actions runs tests
2. If tests pass, it SSHs to your server
3. Pulls the latest code
4. Installs dependencies
5. Runs database migrations
6. Restarts the application

## Testing

1. Make a small change to your code
2. Commit and push:
   ```bash
   git add .
   git commit -m "Test auto-deployment"
   git push
   ```
3. Go to GitHub → Actions tab to watch the deployment
4. Check your server:
   ```bash
   pm2 logs smartline-api
   ```

## Troubleshooting

### Permission Denied
- Make sure the SSH key has correct permissions: `chmod 600 ~/.ssh/github_actions_key`
- Verify the public key is in server's `~/.ssh/authorized_keys`

### PM2 Command Not Found
- Run deployment commands with full path: `/usr/bin/pm2`
- Or add to PATH in the deployment script

### Git Pull Fails
- Make sure the server has the correct git remote
- Check if there are uncommitted changes on server

## Security Notes

1. Use a dedicated SSH key for GitHub Actions
2. Consider using a deployment user with limited permissions
3. Regularly rotate SSH keys
4. Monitor GitHub Actions logs for any issues