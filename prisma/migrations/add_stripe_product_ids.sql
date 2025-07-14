-- Add Stripe product and price IDs to SubscriptionPlan
ALTER TABLE "SubscriptionPlan" 
ADD COLUMN "stripeProductId" TEXT,
ADD COLUMN "stripePriceId" TEXT;

-- Update existing plans with Stripe IDs
UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_SfzJAUQNqkiB6A' WHERE "id" = 'free';
UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_SfzM0Is3Ih667I' WHERE "id" = 'starter';
UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_SfzOf9cmSnqb9j' WHERE "id" = 'professional';
UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_SfzQFQ3a5HtkSW' WHERE "id" = 'business';
UPDATE "SubscriptionPlan" SET "stripeProductId" = 'prod_SfzRZU37WDjZMa' WHERE "id" = 'enterprise';