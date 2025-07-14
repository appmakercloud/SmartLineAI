// Stripe configuration
const stripeConfig = {
  // Map local plan IDs to Stripe product and price IDs
  plans: {
    free: {
      productId: 'prod_SfzJAUQNqkiB6A',
      priceId: process.env.STRIPE_PRICE_FREE || 'price_free_trial'
    },
    starter: {
      productId: 'prod_SfzM0Is3Ih667I',
      priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly'
    },
    professional: {
      productId: 'prod_SfzOf9cmSnqb9j',
      priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_monthly'
    },
    business: {
      productId: 'prod_SfzQFQ3a5HtkSW',
      priceId: process.env.STRIPE_PRICE_BUSINESS || 'price_business_monthly'
    },
    enterprise: {
      productId: 'prod_SfzRZU37WDjZMa',
      priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly'
    }
  }
};

module.exports = stripeConfig;