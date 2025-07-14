-- Add free trial fields to User table
ALTER TABLE "User" 
ADD COLUMN "freeTrialStartsAt" TIMESTAMP,
ADD COLUMN "freeTrialEndsAt" TIMESTAMP,
ADD COLUMN "freeMinutesUsed" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "freeSmsUsed" INTEGER DEFAULT 0,
ADD COLUMN "trialPhoneNumber" TEXT,
ADD COLUMN "trialStatus" TEXT DEFAULT 'none';

-- Update default credits to 0 for new users
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0;

-- Add indexes for performance
CREATE INDEX "User_trialStatus_idx" ON "User"("trialStatus");
CREATE INDEX "User_freeTrialEndsAt_idx" ON "User"("freeTrialEndsAt");