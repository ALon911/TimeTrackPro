// AI Suggestions Configuration
// Modify these values to control API usage and costs

export const AI_CONFIG = {
  // API Call Limits
  MAX_DAILY_API_CALLS: parseInt(process.env.AI_MAX_DAILY_CALLS || '10'),
  MAX_SUGGESTIONS_PER_CALL: parseInt(process.env.AI_MAX_SUGGESTIONS || '3'),
  
  // Cooldown Periods (in milliseconds)
  SUGGESTION_COOLDOWN: parseInt(process.env.AI_COOLDOWN_HOURS || '168') * 60 * 60 * 1000, // 7 days default
  
  // Data Requirements
  MIN_DATA_POINTS: parseInt(process.env.AI_MIN_DATA_POINTS || '1'),
  
  // Cost Optimization
  USE_CACHED_SUGGESTIONS: process.env.AI_USE_CACHE === 'true',
  CACHE_DURATION_HOURS: parseInt(process.env.AI_CACHE_HOURS || '24'),
  
  // API Settings
  MAX_TOKENS_PER_REQUEST: parseInt(process.env.AI_MAX_TOKENS || '1000'),
  TEMPERATURE: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  
  // Fallback Settings
  ENABLE_FALLBACK_SUGGESTIONS: process.env.AI_ENABLE_FALLBACK === 'true',
  FALLBACK_SUGGESTION_COUNT: parseInt(process.env.AI_FALLBACK_COUNT || '2'),
};

// API Usage Calculator
export class APIUsageCalculator {
  static calculateDailyCost(
    dailyCalls: number,
    avgTokensPerCall: number = 500,
    costPer1kTokens: number = 0.002 // Llama 4 Maverick pricing (example)
  ): number {
    const totalTokens = dailyCalls * avgTokensPerCall;
    return (totalTokens / 1000) * costPer1kTokens;
  }
  
  static calculateMonthlyCost(dailyCalls: number): number {
    const dailyCost = this.calculateDailyCost(dailyCalls);
    return dailyCost * 30;
  }
  
  static getUsageRecommendations(userCount: number): {
    recommendedDailyCalls: number;
    estimatedMonthlyCost: number;
    costPerUser: number;
  } {
    // Conservative estimate: 1 call per user per week
    const recommendedDailyCalls = Math.ceil(userCount / 7);
    const estimatedMonthlyCost = this.calculateMonthlyCost(recommendedDailyCalls);
    const costPerUser = estimatedMonthlyCost / userCount;
    
    return {
      recommendedDailyCalls,
      estimatedMonthlyCost,
      costPerUser
    };
  }
}

// Rate Limiting Helper
export class RateLimiter {
  private static callHistory: Map<string, number[]> = new Map();
  
  static canMakeCall(identifier: string, maxCalls: number, timeWindowMs: number): boolean {
    const now = Date.now();
    const calls = this.callHistory.get(identifier) || [];
    
    // Remove old calls outside the time window
    const recentCalls = calls.filter(time => now - time < timeWindowMs);
    
    if (recentCalls.length >= maxCalls) {
      return false;
    }
    
    // Add current call
    recentCalls.push(now);
    this.callHistory.set(identifier, recentCalls);
    
    return true;
  }
  
  static getRemainingCalls(identifier: string, maxCalls: number, timeWindowMs: number): number {
    const now = Date.now();
    const calls = this.callHistory.get(identifier) || [];
    const recentCalls = calls.filter(time => now - time < timeWindowMs);
    
    return Math.max(0, maxCalls - recentCalls.length);
  }
}
