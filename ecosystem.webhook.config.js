module.exports = {
  apps: [{
    name: 'smartline-webhook',
    script: './deploy-webhook.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      WEBHOOK_PORT: 3001,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'change-this-secret'
    },
    error_file: './logs/webhook-err.log',
    out_file: './logs/webhook-out.log',
    log_file: './logs/webhook-combined.log',
    time: true
  }]
};