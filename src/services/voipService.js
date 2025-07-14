const plivoService = require('./plivoService');
const twilioService = require('./twilioService');
const { logger } = require('../middleware/logging');

class VoIPService {
  constructor() {
    this.providers = {
      plivo: plivoService,
      twilio: twilioService
    };
    
    // Default provider based on what's configured
    this.defaultProvider = process.env.DEFAULT_VOIP_PROVIDER || 'twilio';
  }

  // Get the appropriate service based on provider preference
  getService(provider = null) {
    const selectedProvider = provider || this.defaultProvider;
    
    // Check if provider credentials are configured
    if (selectedProvider === 'plivo' && (!process.env.PLIVO_AUTH_ID || !process.env.PLIVO_AUTH_TOKEN)) {
      logger.warn('Plivo credentials not configured, falling back to Twilio');
      return this.providers.twilio;
    }
    
    if (selectedProvider === 'twilio' && (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN)) {
      logger.warn('Twilio credentials not configured, falling back to Plivo');
      return this.providers.plivo;
    }
    
    return this.providers[selectedProvider] || this.providers[this.defaultProvider];
  }

  // Search available numbers from preferred provider
  async searchNumbers(countryCode = 'US', type = 'local', pattern = null, areaCode = null, provider = null) {
    const service = this.getService(provider);
    const providerName = provider || this.defaultProvider;
    
    try {
      logger.info(`Searching numbers using ${providerName}`, { countryCode, type, pattern, areaCode });
      const numbers = await service.searchNumbers(countryCode, type, pattern, areaCode);
      
      // Add provider info to results
      return numbers.map(num => ({
        ...num,
        provider: providerName
      }));
    } catch (error) {
      logger.error(`Failed to search numbers with ${providerName}, trying alternate provider`);
      
      // Try alternate provider
      const alternateProvider = providerName === 'plivo' ? 'twilio' : 'plivo';
      const alternateService = this.getService(alternateProvider);
      
      try {
        const numbers = await alternateService.searchNumbers(countryCode, type, pattern, areaCode);
        return numbers.map(num => ({
          ...num,
          provider: alternateProvider
        }));
      } catch (alternateError) {
        logger.error('Both providers failed to search numbers');
        throw new Error('Unable to search numbers from any provider');
      }
    }
  }

  // Buy a number using specified provider
  async buyNumber(number, userId, provider = null) {
    const service = this.getService(provider);
    return await service.buyNumber(number, userId);
  }

  // Release a number
  async releaseNumber(number, userId, provider) {
    const service = this.getService(provider);
    return await service.releaseNumber(number, userId);
  }

  // Make a call
  async makeCall(from, to, userId, provider) {
    const service = this.getService(provider);
    return await service.makeCall(from, to, userId);
  }

  // Send SMS
  async sendSMS(from, to, text, userId, provider) {
    const service = this.getService(provider);
    return await service.sendSMS(from, to, text, userId);
  }

  // Get recording
  async getRecording(callId, provider) {
    const service = this.getService(provider);
    return await service.getRecording(callId);
  }

  // Get provider-specific rates
  getRates(provider = null) {
    const selectedProvider = provider || this.defaultProvider;
    
    const rates = {
      plivo: {
        number: { US: 0.80, GB: 1.00, CA: 0.80 },
        call: { US: 0.0050, GB: 0.0075, CA: 0.0050 },
        sms: { US: 0.0050, GB: 0.0400, CA: 0.0050 }
      },
      twilio: {
        number: { US: 1.15, GB: 1.00, CA: 1.15 },
        call: { US: 0.0085, GB: 0.0175, CA: 0.0085 },
        sms: { US: 0.0079, GB: 0.0400, CA: 0.0079 }
      }
    };
    
    return rates[selectedProvider];
  }

  // Check which providers are available
  getAvailableProviders() {
    const available = [];
    
    if (process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN) {
      available.push('plivo');
    }
    
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      available.push('twilio');
    }
    
    return available;
  }
}

module.exports = new VoIPService();