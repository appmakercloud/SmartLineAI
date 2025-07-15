// Stripe configuration
const stripeConfig = {
  // Map local plan IDs to Stripe product and price IDs
  plans: {
    free: {
      productId: 'prod_Sg35Z4AfaVPtfE',
      priceId: process.env.STRIPE_PRICE_FREE || 'price_1RkgywPAlYPOyo6SuznmPqId'
    },
    starter: {
      productId: 'prod_Sg366EQwqorvx9',
      priceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_1RkgzqPAlYPOyo6SWeOw7QbX'
    },
    professional: {
      productId: 'prod_Sg37ITAePdnELv',
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_1Rkh17PAlYPOyo6SSjubU0dG'
    },
    business: {
      productId: 'prod_Sg38E0mcZ3WcB5',
      priceId: process.env.STRIPE_PRICE_ID_BUSINESS || 'price_1Rkh1pPAlYPOyo6S6CJ1kJrE'
    },
    enterprise: {
      productId: 'prod_Sg38KFqwVoHrr4',
      priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1Rkh2ePAlYPOyo6SewVz8S0I'
    }
  }
};

module.exports = stripeConfig;