const OpenAI = require('openai');
const { logger } = require('../middleware/logging');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Summarize voicemail
  async summarizeVoicemail(transcription) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes voicemails concisely. Extract key information like caller intent, important details, and any action items.'
          },
          {
            role: 'user',
            content: `Please summarize this voicemail transcript: "${transcription}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('AI summarization error:', error);
      return 'Summary unavailable';
    }
  }

  // Generate smart reply
  async generateSmartReply(message, context = '') {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional assistant helping to craft business text message replies. Keep responses brief, professional, and friendly.'
          },
          {
            role: 'user',
            content: `Message received: "${message}"${context ? `\nContext: ${context}` : ''}\n\nGenerate a professional reply:`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Smart reply generation error:', error);
      throw new Error('Failed to generate reply');
    }
  }

  // Analyze call patterns
  async analyzeCallPatterns(calls) {
    try {
      const callData = calls.map(call => ({
        duration: call.duration,
        time: new Date(call.createdAt).getHours(),
        dayOfWeek: new Date(call.createdAt).getDay(),
        direction: call.direction
      }));

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze call patterns and provide insights about peak times, average duration, and suggestions for better availability.'
          },
          {
            role: 'user',
            content: `Analyze these call patterns: ${JSON.stringify(callData)}`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Call pattern analysis error:', error);
      return 'Analysis unavailable';
    }
  }

  // Generate professional voicemail greeting
  async generateVoicemailGreeting(businessName, businessType) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate professional voicemail greetings for businesses. Keep them brief, friendly, and professional.'
          },
          {
            role: 'user',
            content: `Generate a voicemail greeting for ${businessName}, a ${businessType} business.`
          }
        ],
        max_tokens: 100,
        temperature: 0.8
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Greeting generation error:', error);
      throw new Error('Failed to generate greeting');
    }
  }
}

module.exports = new AIService();