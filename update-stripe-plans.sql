-- Update subscription plans with Stripe Product and Price IDs

-- Update Free Trial plan
UPDATE subscription_plans 
SET 
    stripe_product_id = 'prod_Sg35Z4AfaVPtfE',
    stripe_price_id = 'price_1RkgywPAlYPOyo6SuznmPqId'
WHERE id = 'free';

-- Update Starter plan
UPDATE subscription_plans 
SET 
    stripe_product_id = 'prod_Sg366EQwqorvx9',
    stripe_price_id = 'price_1RkgzqPAlYPOyo6SWeOw7QbX'
WHERE id = 'starter';

-- Update Professional plan
UPDATE subscription_plans 
SET 
    stripe_product_id = 'prod_Sg37ITAePdnELv',
    stripe_price_id = 'price_1Rkh17PAlYPOyo6SSjubU0dG'
WHERE id = 'professional';

-- Update Business plan
UPDATE subscription_plans 
SET 
    stripe_product_id = 'prod_Sg38E0mcZ3WcB5',
    stripe_price_id = 'price_1Rkh1pPAlYPOyo6S6CJ1kJrE'
WHERE id = 'business';

-- Update Enterprise plan
UPDATE subscription_plans 
SET 
    stripe_product_id = 'prod_Sg38KFqwVoHrr4',
    stripe_price_id = 'price_1Rkh2ePAlYPOyo6SewVz8S0I'
WHERE id = 'enterprise';

-- Verify the updates
SELECT id, name, display_name, price, stripe_product_id, stripe_price_id 
FROM subscription_plans 
ORDER BY sort_order;