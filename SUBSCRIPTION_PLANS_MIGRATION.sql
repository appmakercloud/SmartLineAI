-- Create subscription plans table
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "interval" TEXT NOT NULL DEFAULT 'month',
  
  -- Limits and features
  "includedMinutes" INTEGER NOT NULL,
  "includedSms" INTEGER NOT NULL,
  "includedNumbers" INTEGER NOT NULL,
  "pricePerExtraMinute" DOUBLE PRECISION NOT NULL DEFAULT 0.025,
  "pricePerExtraSms" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
  "pricePerExtraNumber" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  
  -- Features
  "hasAiFeatures" BOOLEAN NOT NULL DEFAULT false,
  "hasVoicemailTranscription" BOOLEAN NOT NULL DEFAULT false,
  "hasCallRecording" BOOLEAN NOT NULL DEFAULT false,
  "hasAutoAttendant" BOOLEAN NOT NULL DEFAULT false,
  "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
  "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
  "hasCrmIntegration" BOOLEAN NOT NULL DEFAULT false,
  "hasTeamFeatures" BOOLEAN NOT NULL DEFAULT false,
  "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert the subscription plans
INSERT INTO "SubscriptionPlan" (
  "id", "name", "displayName", "price", "includedMinutes", "includedSms", "includedNumbers",
  "hasAiFeatures", "hasVoicemailTranscription", "hasCallRecording", "hasAutoAttendant",
  "hasAnalytics", "hasApiAccess", "hasCrmIntegration", "hasTeamFeatures", "hasPrioritySupport",
  "sortOrder"
) VALUES 
  -- Free plan (for reference, not purchasable)
  ('free', 'free', 'Free Trial', 0, 50, 50, 1, 
   false, false, false, false, false, false, false, false, false, 0),
  
  -- Starter plan
  ('starter', 'starter', 'Starter', 19, 300, 500, 1,
   false, false, false, false, false, false, false, false, false, 1),
  
  -- Professional plan
  ('professional', 'professional', 'Professional', 39, 1000, 1000, 1,
   true, true, true, true, true, true, false, false, false, 2),
  
  -- Business plan
  ('business', 'business', 'Business', 79, 2500, 2000, 3,
   true, true, true, true, true, true, true, true, false, 3),
  
  -- Enterprise plan
  ('enterprise', 'enterprise', 'Enterprise', 149, 999999, 999999, 10,
   true, true, true, true, true, true, true, true, true, 4);

-- Create user subscriptions table to track active subscriptions
CREATE TABLE IF NOT EXISTS "UserSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  
  -- Usage tracking for current period
  "currentPeriodStart" TIMESTAMP NOT NULL,
  "currentPeriodEnd" TIMESTAMP NOT NULL,
  "minutesUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "smsUsed" INTEGER NOT NULL DEFAULT 0,
  
  -- Billing
  "stripeSubscriptionId" TEXT,
  "stripePriceId" TEXT,
  "nextBillingDate" TIMESTAMP,
  "cancelledAt" TIMESTAMP,
  
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
);

-- Add indexes
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");
CREATE INDEX "UserSubscription_currentPeriodEnd_idx" ON "UserSubscription"("currentPeriodEnd");

-- Create usage tracking table for detailed history
CREATE TABLE IF NOT EXISTS "UsageHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'call', 'sms'
  "amount" DOUBLE PRECISION NOT NULL, -- minutes for calls, count for sms
  "date" DATE NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE
);

-- Add indexes for usage queries
CREATE INDEX "UsageHistory_userId_date_idx" ON "UsageHistory"("userId", "date");
CREATE INDEX "UsageHistory_subscriptionId_date_idx" ON "UsageHistory"("subscriptionId", "date");