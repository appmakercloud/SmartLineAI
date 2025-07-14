// Stripe configuration
const stripeConfig = {
  // Map local plan IDs to Stripe product and price IDs
  plans: {
    free: {
      productId: 'prod_SfzJAUQNqkiB6A',
      priceId: process.env.STRIPE_PRICE_FREE || 'price_free_trial'
    },
    starter: {
      productId: process.env.STRIPE_PRODUCT_ID_STARTER || 'prod_RQCqfmJV2jxqor',
      priceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_1QVzwQRwI9tctJBu5lHmp2w4'
    },
    professional: {
      productId: process.env.STRIPE_PRODUCT_ID_PROFESSIONAL || 'prod_RQCqiOJyHdgmbx',
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_1QVzxjRwI9tctJBuEOqQJQvl'
    },
    business: {
      productId: process.env.STRIPE_PRODUCT_ID_BUSINESS || 'prod_RQCqkZxlnBNnQb',
      priceId: process.env.STRIPE_PRICE_ID_BUSINESS || 'price_1QVzyTRwI9tctJBuPsHNXOYA'
    },
    enterprise: {
      productId: 'prod_SfzRZU37WDjZMa',
      priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly'
    }
  }
};

module.exports = stripeConfig;