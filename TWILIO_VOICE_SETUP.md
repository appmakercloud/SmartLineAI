# Twilio Voice SDK Setup Guide

This guide will help you set up Twilio Voice SDK for the SmartLine AI backend to enable proper two-way audio calls from the iOS app.

## Prerequisites

- Twilio account with verified phone numbers
- Access to Twilio Console (https://console.twilio.com)

## Step 1: Create API Keys

1. Log in to Twilio Console
2. Navigate to **Account** → **API keys & tokens**
3. Click **Create API Key**
4. Name it: "SmartLine AI Voice SDK"
5. Key type: **Standard**
6. Click **Create API Key**
7. **IMPORTANT**: Save the SID and Secret immediately (you won't see the secret again)

## Step 2: Create TwiML Application

1. In Twilio Console, go to **Voice** → **TwiML** → **TwiML Apps**
2. Click **Create new TwiML App**
3. Configure:
   - **Friendly Name**: SmartLine AI Voice
   - **Voice URL**: `https://smartline-api-pn16.onrender.com/webhooks/twilio/voice`
   - **Voice Method**: POST
   - **Status Callback URL**: `https://smartline-api-pn16.onrender.com/webhooks/twilio/voice-status`
4. Click **Save**
5. Copy the **TwiML App SID**

## Step 3: Update Environment Variables

Add these to your `.env` file on the backend:

```bash
# Existing Twilio config
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxx

# New additions for Voice SDK
TWILIO_API_KEY_SID=SKxxxxxxxxxxxx
TWILIO_API_KEY_SECRET=xxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxx
```

## Step 4: Create Voice Webhook Handler

Create or update the file `/src/controllers/twilioWebhookController.js`:

```javascript
// Add this method to handle voice calls
async handleVoiceWebhook(req, res) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  const { To, From, CallSid } = req.body;
  
  logger.info('Handling voice webhook', { To, From, CallSid });
  
  // For outgoing calls, just dial the number
  if (To && To !== From) {
    const dial = twiml.dial({
      callerId: From,
      timeout: 30,
      record: 'record-from-answer-dual',
      recordingStatusCallback: `${process.env.BASE_URL}/webhooks/twilio/recording-status`
    });
    
    dial.number(To);
  } else {
    // For incoming calls, you might want to forward to a specific number
    // or play a message
    twiml.say('Welcome to SmartLine AI. Your call is being connected.');
    twiml.pause({ length: 1 });
    twiml.hangup();
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
}

// Add this to handle voice status callbacks
async handleVoiceStatusCallback(req, res) {
  const { CallSid, CallStatus, CallDuration } = req.body;
  
  logger.info('Voice call status update', { 
    CallSid, 
    CallStatus, 
    CallDuration 
  });
  
  // Update call record in database if needed
  if (CallStatus === 'completed') {
    try {
      await prisma.call.updateMany({
        where: { twilioCallSid: CallSid },
        data: { 
          status: 'completed',
          duration: parseInt(CallDuration) || 0
        }
      });
    } catch (error) {
      logger.error('Failed to update call status', error);
    }
  }
  
  res.sendStatus(200);
}
```

## Step 5: Update Webhook Routes

In `/src/routes/webhooks.js`, add:

```javascript
// Voice webhooks
router.post('/twilio/voice', twilioWebhookController.handleVoiceWebhook);
router.post('/twilio/voice-status', twilioWebhookController.handleVoiceStatusCallback);
```

## Step 6: Deploy and Test

1. Deploy the backend with the new changes
2. Test the access token endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        https://smartline-api-pn16.onrender.com/api/twilio/access-token
   ```

3. You should receive:
   ```json
   {
     "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0...",
     "identity": "user-xxxx",
     "ttl": 3600
   }
   ```

## Step 7: Test with iOS App

Once the backend is deployed:

1. The iOS app will automatically detect the access token endpoint
2. Calls will establish proper two-way audio
3. No more "Busy" status in Twilio logs

## Troubleshooting

### "Twilio API keys not configured" error
- Make sure you've added `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET` to your environment variables

### "Twilio service not configured" error
- Ensure `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set

### Calls still showing as "Busy"
- Verify the TwiML Application URL is correct and accessible
- Check Twilio Console logs for any webhook errors
- Ensure the iOS app has microphone permissions

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys periodically
- Monitor Twilio usage to prevent abuse

## Next Steps

- Set up incoming call handling with PushKit
- Implement call recording management
- Add real-time call quality monitoring
- Set up usage tracking and billing