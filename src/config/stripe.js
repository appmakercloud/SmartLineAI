// Stripe configuration
const stripeConfig = {
  // Map local plan IDs to Stripe product and price IDs
  plans: {
    free: {
      productId: 'prod_SfzJAUQNqkiB6A',
      priceId: process.env.STRIPE_PRICE_FREE || 'price_1RkdKRAiU9FS6JYnXLCLcvay'
    },
    starter: {
      productId: 'prod_SfzM0Is3Ih667I',
      priceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_1RkdO7AiU9FS6JYnFk3h7jud'
    },
    professional: {
      productId: 'prod_SfzOf9cmSnqb9j',
      priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_1RkdPqAiU9FS6JYnXtq6XyZ5'
    },
    business: {
      productId: 'prod_SfzQFQ3a5HtkSW',
      priceId: process.env.STRIPE_PRICE_ID_BUSINESS || 'price_1RkdRRAiU9FS6JYn4rdYBBUW'
    },
    enterprise: {
      productId: 'prod_SfzRZU37WDjZMa',
      priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1RkdScAiU9FS6JYnQEHex3rN'
    }
  }
};

module.exports = stripeConfig;