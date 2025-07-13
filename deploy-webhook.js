const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();

// Webhook secret - set this in GitHub and as environment variable
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret';
const PORT = process.env.WEBHOOK_PORT || 3001;

app.use(express.json());

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Deployment script
const deployScript = `
  cd /var/www/smartline-api/SmartLineAI
  git pull origin main
  npm install
  npx prisma generate
  npx prisma migrate deploy
  pm2 restart smartline-api
  pm2 save
`;

app.post('/deploy', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  
  // Verify webhook signature
  if (!signature || !verifySignature(req.body, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Check if push is to main branch
  if (req.body.ref !== 'refs/heads/main' && req.body.ref !== 'refs/heads/master') {
    return res.status(200).send('Not main branch, skipping deployment');
  }
  
  console.log('Deploying application...');
  
  // Execute deployment
  exec(deployScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`Deployment error: ${error}`);
      return res.status(500).send('Deployment failed');
    }
    
    console.log(`Deployment output: ${stdout}`);
    if (stderr) console.error(`Deployment stderr: ${stderr}`);
    
    res.status(200).send('Deployment successful');
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('Webhook server is running');
});

app.listen(PORT, () => {
  console.log(`Deployment webhook server listening on port ${PORT}`);
});

// PM2 graceful shutdown
process.on('SIGINT', () => {
  console.log('Webhook server shutting down...');
  process.exit(0);
});