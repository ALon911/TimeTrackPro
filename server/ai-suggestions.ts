import OpenAI from 'openai';
import { storage } from './storage';
import { TimeEntry, Topic } from '@shared/schema';
import { AI_CONFIG, RateLimiter } from './ai-config';

// Initialize OpenAI client for Llama 4 Maverick API (only if API key is available)
let openai: OpenAI | null = null;

if (process.env.LLAMA_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.LLAMA_API_KEY,
    baseURL: 'https://api.aimlapi.com/v1', // Llama 4 Maverick API endpoint
  });
} else {
  console.log('🤖 AI Suggestions: API key not set. Using fallback suggestions.');
}

export interface UserActivityData {
  totalTimeEntries: number;
  totalTimeSpent: number;
  averageSessionDuration: number;
  mostActiveTopics: Array<{
    topic: Topic;
    totalTime: number;
    percentage: number;
  }>;
  recentTimeEntries: TimeEntry[];
  weeklyPattern: Array<{
    day: string;
    totalTime: number;
  }>;
  peakHours: number[];
  workPatterns: string[];
}

export interface AISuggestion {
  id: string;
  type: 'productivity' | 'time_management' | 'work_life_balance' | 'goal_setting' | 'summary' | 'insights';
  title: string;
  description: string;
  actionable: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  createdAt: string;
  isRead: boolean;
  isApplied: boolean;
}

export interface UserSummary {
  totalTimeSpent: number;
  averageSessionDuration: number;
  mostProductiveHours: number[];
  topTopics: Array<{
    topic: string;
    time: number;
    percentage: number;
  }>;
  weeklyPattern: Array<{
    day: string;
    totalTime: number;
  }>;
  productivityScore: number;
  suggestions: string[];
}

export class AISuggestionsService {
  private readonly MIN_DATA_POINTS = AI_CONFIG.MIN_DATA_POINTS;
  private readonly SUGGESTION_COOLDOWN = AI_CONFIG.SUGGESTION_COOLDOWN;
  private readonly MAX_DAILY_API_CALLS = AI_CONFIG.MAX_DAILY_API_CALLS;
  private readonly MAX_SUGGESTIONS_PER_CALL = AI_CONFIG.MAX_SUGGESTIONS_PER_CALL;
  private dailyApiCallCount = 0;
  private lastResetDate = new Date().toDateString();

  async generateSuggestions(userId: number): Promise<AISuggestion[]> {
    try {
      console.log('Starting AI suggestions generation for user:', userId);
      
      // Check if user has enough data for suggestions
      const hasEnoughData = await this.checkUserDataAvailability(userId);
      if (!hasEnoughData) {
        console.log('Not enough data for suggestions, returning fallback');
        // Save fallback suggestions to database so they appear
        const fallbackSuggestions = this.getFallbackSuggestions();
        await this.saveSuggestions(userId, fallbackSuggestions);
        return fallbackSuggestions;
      }

      // Check if suggestions were generated recently
      const recentSuggestions = await this.getRecentSuggestions(userId);
      if (recentSuggestions.length > 0) {
        const lastSuggestion = recentSuggestions[0];
        const timeSinceLastSuggestion = Date.now() - new Date(lastSuggestion.createdAt).getTime();
        if (timeSinceLastSuggestion < this.SUGGESTION_COOLDOWN) {
          console.log('Recent suggestions found, returning cached suggestions');
          return recentSuggestions;
        }
      }

      // Check daily API call limit
      if (!this.canMakeApiCall()) {
        console.log('Daily API call limit reached. Returning cached suggestions.');
        return await this.getRecentSuggestions(userId);
      }

      // Get user activity data
      const activityData = await this.getUserActivityData(userId);
      console.log('User activity data retrieved:', {
        totalTimeEntries: activityData.totalTimeEntries,
        totalTimeSpent: activityData.totalTimeSpent
      });
      
      // Generate AI suggestions
      const suggestions = await this.generateAISuggestions(activityData);
      console.log('AI suggestions generated:', suggestions.length);
      
      // Save suggestions to database
      await this.saveSuggestions(userId, suggestions);
      console.log('Suggestions saved to database');
      
      // Increment API call count
      this.incrementApiCallCount();
      
      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      console.log('Returning fallback suggestions due to error');
      return this.getFallbackSuggestions();
    }
  }

  private async checkUserDataAvailability(userId: number): Promise<boolean> {
    try {
      const timeEntries = await storage.getTimeEntries(userId, { limit: this.MIN_DATA_POINTS });
      return timeEntries.length >= this.MIN_DATA_POINTS;
    } catch (error) {
      console.error('Error checking user data availability:', error);
      return false;
    }
  }

  private async getUserActivityData(userId: number): Promise<UserActivityData> {
    const timeEntries = await storage.getTimeEntries(userId, { limit: 100 });
    const topics = await storage.getTopics(userId);
    
    const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const averageSessionDuration = timeEntries.length > 0 ? totalTimeSpent / timeEntries.length : 0;
    
    // Calculate topic distribution
    const topicStats = new Map<number, { topic: Topic; totalTime: number }>();
    timeEntries.forEach(entry => {
      const topic = topics.find(t => t.id === entry.topicId);
      if (topic) {
        const existing = topicStats.get(topic.id) || { topic, totalTime: 0 };
        existing.totalTime += entry.duration;
        topicStats.set(topic.id, existing);
      }
    });
    
    const mostActiveTopics = Array.from(topicStats.values())
      .map(stat => ({
        topic: stat.topic,
        totalTime: stat.totalTime,
        percentage: (stat.totalTime / totalTimeSpent) * 100
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 5);
    
    // Calculate weekly pattern
    const weeklyPattern = this.calculateWeeklyPattern(timeEntries);
    
    // Calculate peak hours
    const peakHours = this.calculatePeakHours(timeEntries);
    
    // Identify work patterns
    const workPatterns = this.identifyWorkPatterns(timeEntries, weeklyPattern);
    
    return {
      totalTimeEntries: timeEntries.length,
      totalTimeSpent,
      averageSessionDuration,
      mostActiveTopics,
      recentTimeEntries: timeEntries.slice(0, 10),
      weeklyPattern,
      peakHours,
      workPatterns
    };
  }

  private calculateWeeklyPattern(timeEntries: TimeEntry[]): Array<{day: string, totalTime: number}> {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const pattern = days.map(day => ({ day, totalTime: 0 }));
    
    timeEntries.forEach(entry => {
      const date = new Date(entry.startTime);
      const dayOfWeek = date.getDay();
      pattern[dayOfWeek].totalTime += entry.duration;
    });
    
    return pattern;
  }

  private calculatePeakHours(timeEntries: TimeEntry[]): number[] {
    const hourCounts = new Map<number, number>();
    
    timeEntries.forEach(entry => {
      const startHour = new Date(entry.startTime).getHours();
      hourCounts.set(startHour, (hourCounts.get(startHour) || 0) + 1);
    });
    
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private identifyWorkPatterns(timeEntries: TimeEntry[], weeklyPattern: Array<{day: string, totalTime: number}>): string[] {
    const patterns: string[] = [];
    
    // Check for morning person
    const morningEntries = timeEntries.filter(entry => {
      const hour = new Date(entry.startTime).getHours();
      return hour >= 6 && hour < 12;
    });
    if (morningEntries.length > timeEntries.length * 0.4) {
      patterns.push('morning_person');
    }
    
    // Check for night owl
    const nightEntries = timeEntries.filter(entry => {
      const hour = new Date(entry.startTime).getHours();
      return hour >= 18 || hour < 6;
    });
    if (nightEntries.length > timeEntries.length * 0.4) {
      patterns.push('night_owl');
    }
    
    // Check for weekend worker
    const weekendEntries = timeEntries.filter(entry => {
      const day = new Date(entry.startTime).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    if (weekendEntries.length > 0) {
      patterns.push('weekend_worker');
    }
    
    // Check for consistent daily worker
    const workDays = weeklyPattern.filter(day => day.totalTime > 0).length;
    if (workDays >= 5) {
      patterns.push('consistent_daily');
    }
    
    return patterns;
  }

  private async generateAISuggestions(activityData: UserActivityData): Promise<AISuggestion[]> {
    try {
      if (!openai) {
        console.log('AI Suggestions: OpenAI client not initialized. Returning fallback suggestions.');
        return this.getFallbackSuggestions();
      }

      console.log('Making API call to generate AI suggestions...');
      const prompt = this.buildPrompt(activityData);
      
      const response = await openai.chat.completions.create({
        model: 'meta-llama/llama-4-maverick',
        messages: [
          {
            role: 'system',
            content: 'אתה מאמן פרודוקטיביות AI. תן 3 הצעות ספציפיות ומעשיות בהתבסס על נתוני מעקב זמן. חשוב מאוד: החזר תגובות בעברית בלבד - כל הטקסט חייב להיות בעברית. שמור על תגובות קצרות ומדויקות. אל תחזיר שום טקסט באנגלית. כל כותרת, תיאור ופעולה חייבים להיות בעברית.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: AI_CONFIG.MAX_TOKENS_PER_REQUEST,
        temperature: AI_CONFIG.TEMPERATURE,
      });

      const suggestionsText = response.choices[0]?.message?.content || '';
      console.log('AI API response received, length:', suggestionsText.length);
      
      // Check if the response contains English text and translate if needed
      const translatedText = await this.translateToHebrewIfNeeded(suggestionsText);
      
      const suggestions = this.parseSuggestions(translatedText);
      console.log('Parsed suggestions:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      console.log('API call failed, returning fallback suggestions');
      return this.getFallbackSuggestions();
    }
  }

  private async translateToHebrewIfNeeded(text: string): Promise<string> {
    // Check if the text contains English words (simple heuristic)
    const englishWords = ['Schedule', 'Focus', 'Time', 'Peak', 'hours', 'indicating', 'high', 'productivity', 'Schedule', 'most', 'important', 'tasks', 'during', 'these', 'hours', 'Total', 'time', 'tracked', 'under', 'hour', 'across', 'entries', 'indicating', 'potential', 'for', 'more', 'efficient', 'task', 'switching', 'or', 'batching', 'Inconsistent', 'tracking', 'data', 'may', 'indicate', 'lack', 'of', 'routine', 'Establishing', 'routine', 'can', 'improve', 'work-life', 'balance', 'Block', 'for', 'focused', 'work', 'Group', 'similar', 'tasks', 'together', 'to', 'minimize', 'switching', 'Set', 'daily', 'schedule', 'with', 'dedicated', 'work', 'hours'];
    
    const hasEnglish = englishWords.some(word => text.includes(word));
    
    if (!hasEnglish) {
      return text; // Already in Hebrew
    }
    
    console.log('English text detected, translating to Hebrew...');
    return await this.translateText(text);
  }

  private async translateSuggestionToHebrew(suggestion: AISuggestion): Promise<AISuggestion> {
    const translatedTitle = await this.translateText(suggestion.title);
    const translatedDescription = await this.translateText(suggestion.description);
    const translatedActionable = await this.translateText(suggestion.actionable);
    
    return {
      ...suggestion,
      title: translatedTitle,
      description: translatedDescription,
      actionable: translatedActionable
    };
  }

  private isHebrewText(text: string): boolean {
    // Check if text contains Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/;
    return hebrewRegex.test(text);
  }

  private async translateText(text: string): Promise<string> {
    if (!openai) {
      return text; // Return original if no API available
    }
    
    try {
      const translationResponse = await openai.chat.completions.create({
        model: 'meta-llama/llama-4-maverick',
        messages: [
          {
            role: 'system',
            content: 'אתה מתרגם מקצועי. תרגם את הטקסט הבא לעברית. החזר רק את התרגום ללא הסברים נוספים.'
          },
          {
            role: 'user',
            content: `Translate to Hebrew: ${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });
      
      return translationResponse?.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original if translation fails
    }
  }

  private buildPrompt(activityData: UserActivityData): string {
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} שעות ו-${minutes} דקות`;
    };

    return `חשוב מאוד: החזר את כל התגובה בעברית בלבד! אל תחזיר שום טקסט באנגלית. כל כותרת, תיאור ופעולה חייבים להיות בעברית.
נתח נתוני מעקב זמן ותן 3 הצעות פרודוקטיביות:

נתונים: ${activityData.totalTimeEntries} רשומות, ${formatTime(activityData.totalTimeSpent)} סה"כ, שעות שיא: ${activityData.peakHours.join(',')}, דפוסים: ${activityData.workPatterns.join(',')}

תן 3 הצעות ספציפיות לפרודוקטיביות, ניהול זמן, או איזון עבודה-חיים. חשוב מאוד: כל הטקסט חייב להיות בעברית - כותרת, תיאור ופעולה. אל תחזיר שום טקסט באנגלית. החזר JSON:
{
  "suggestions": [
    {
      "type": "productivity|time_management|work_life_balance|goal_setting",
      "title": "כותרת קצרה בעברית בלבד",
      "description": "הסבר בעברית בלבד",
      "actionable": "פעולה ספציפית בעברית בלבד",
      "priority": "low|medium|high",
      "confidence": 0.8
    }
  ]
}

חשוב: כל הטקסט חייב להיות בעברית בלבד! אל תחזיר שום טקסט באנגלית.`;
  }

  private parseSuggestions(suggestionsText: string): AISuggestion[] {
    try {
      // Extract JSON from the response
      const jsonMatch = suggestionsText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions = parsed.suggestions || [];

      return suggestions.map((suggestion: any, index: number) => ({
        id: `suggestion_${Date.now()}_${index}`,
        type: suggestion.type || 'productivity',
        title: suggestion.title || 'Suggestion',
        description: suggestion.description || '',
        actionable: suggestion.actionable || '',
        priority: suggestion.priority || 'medium',
        confidence: suggestion.confidence || 0.8,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      }));
    } catch (error) {
      console.error('Error parsing suggestions:', error);
      return this.getFallbackSuggestions();
    }
  }

  private getFallbackSuggestions(): AISuggestion[] {
    return [
      {
        id: `fallback_${Date.now()}_1`,
        type: 'productivity',
        title: 'עקוב אחר שעות הפרודוקטיביות שלך',
        description: 'תבסס על נתוני מעקב הזמן שלך, נראה שיש לך דפוסי עבודה עקביים. נסה לתזמן את המשימות החשובות ביותר שלך במהלך שעות הפרודוקטיביות שלך.',
        actionable: 'סקור את רשומות הזמן שלך כדי לזהות מתי אתה הכי פרודוקטיבי, ואז תזמן משימות מאתגרות במהלך השעות האלה.',
        priority: 'medium',
        confidence: 0.6,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      },
      {
        id: `fallback_${Date.now()}_2`,
        type: 'time_management',
        title: 'קח הפסקות קבועות',
        description: 'משכי עבודה ארוכים יכולים להוביל לשחיקה. שקול לקחת הפסקות קצרות בין משימות כדי לשמור על ריכוז ופרודוקטיביות.',
        actionable: 'הגדר טיימר למשכי עבודה של 25 דקות ואחריהם הפסקות של 5 דקות (טכניקת פומודורו).',
        priority: 'high',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      },
      {
        id: `fallback_${Date.now()}_3`,
        type: 'goal_setting',
        title: 'הגדר מטרות יומיות ברורות',
        description: 'התחל כל יום בכתיבת 3 מטרות ספציפיות שאתה רוצה להשיג.',
        actionable: 'השתמש במסגרת SMART: ספציפי, מדיד, בר השגה, רלוונטי, מוגבל בזמן.',
        priority: 'high',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      }
    ];
  }

  private canMakeApiCall(): boolean {
    const today = new Date().toDateString();
    
    // Reset counter if it's a new day
    if (this.lastResetDate !== today) {
      this.dailyApiCallCount = 0;
      this.lastResetDate = today;
    }
    
    return this.dailyApiCallCount < this.MAX_DAILY_API_CALLS;
  }

  private incrementApiCallCount(): void {
    this.dailyApiCallCount++;
    console.log(`API calls today: ${this.dailyApiCallCount}/${this.MAX_DAILY_API_CALLS}`);
  }

  // Get current API usage stats
  public getApiUsageStats(): { callsToday: number; maxCalls: number; cooldownHours: number } {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyApiCallCount = 0;
      this.lastResetDate = today;
    }
    
    return {
      callsToday: this.dailyApiCallCount,
      maxCalls: this.MAX_DAILY_API_CALLS,
      cooldownHours: this.SUGGESTION_COOLDOWN / (60 * 60 * 1000)
    };
  }

  // Get suggestions for a user
  public async getSuggestions(userId: number): Promise<AISuggestion[]> {
    try {
      const suggestions = await storage.getRecentAISuggestions(userId, 24); // Last 24 hours
      // Don't translate again - suggestions are already translated when saved
      return suggestions as AISuggestion[];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  // Save suggestions to database
  private async saveSuggestions(userId: number, suggestions: AISuggestion[]): Promise<void> {
    for (const suggestion of suggestions) {
      // Check if suggestion is already in Hebrew (fallback suggestions)
      const isAlreadyHebrew = this.isHebrewText(suggestion.title);
      
      const finalSuggestion = isAlreadyHebrew ? suggestion : await this.translateSuggestionToHebrew(suggestion);
      
      await storage.createAISuggestion({
        id: finalSuggestion.id,
        userId: userId,
        type: finalSuggestion.type,
        title: finalSuggestion.title,
        description: finalSuggestion.description,
        actionable: finalSuggestion.actionable,
        priority: finalSuggestion.priority,
        confidence: Math.round(finalSuggestion.confidence * 100), // Convert to 0-100 scale
        isRead: finalSuggestion.isRead,
        isApplied: finalSuggestion.isApplied,
        createdAt: finalSuggestion.createdAt
      });
    }
  }

  // Get recent suggestions
  private async getRecentSuggestions(userId: number): Promise<AISuggestion[]> {
    try {
      const suggestions = await storage.getRecentAISuggestions(userId, 24); // Last 24 hours
      // Don't translate again - suggestions are already translated when saved
      return suggestions as AISuggestion[];
    } catch (error) {
      console.error('Error fetching recent suggestions:', error);
      return [];
    }
  }

  // Generate user summary and insights
  public async generateUserSummary(userId: number): Promise<UserSummary> {
    try {
      const activityData = await this.getUserActivityData(userId);
      
      if (activityData.totalTimeEntries < this.MIN_DATA_POINTS) {
        return this.getFallbackSummary();
      }

      const summary: UserSummary = {
        totalTimeSpent: activityData.totalTimeSpent,
        averageSessionDuration: activityData.averageSessionDuration,
        mostProductiveHours: activityData.peakHours,
        topTopics: activityData.mostActiveTopics.map(topic => ({
          topic: topic.topic.name,
          time: topic.totalTime,
          percentage: topic.percentage
        })),
        weeklyPattern: activityData.weeklyPattern,
        productivityScore: this.calculateProductivityScore(activityData),
        suggestions: this.generateSummarySuggestions(activityData)
      };

      return summary;
    } catch (error) {
      console.error('Error generating user summary:', error);
      return this.getFallbackSummary();
    }
  }

  // Generate insights suggestions
  public async generateInsightsSuggestions(userId: number): Promise<AISuggestion[]> {
    try {
      const activityData = await this.getUserActivityData(userId);
      
      if (activityData.totalTimeEntries < this.MIN_DATA_POINTS) {
        return this.getFallbackInsightsSuggestions();
      }

      const suggestions: AISuggestion[] = [];

      // Time pattern insights
      if (activityData.peakHours.length > 0) {
        const peakHour = activityData.peakHours[0];
        suggestions.push({
          id: `insight-${Date.now()}-1`,
          type: 'insights',
          title: 'שעת שיא פרודוקטיביות',
          description: `השעה הכי פרודוקטיבית שלך היא ${peakHour}:00. נסה לתזמן משימות חשובות בשעה זו.`,
          actionable: `תזמן את המשימות החשובות ביותר שלך בין ${peakHour}:00-${peakHour + 1}:00`,
          priority: 'high',
          confidence: 0.9,
          createdAt: new Date().toISOString(),
          isRead: false,
          isApplied: false
        });
      }

      // Topic distribution insights
      if (activityData.mostActiveTopics.length > 0) {
        const topTopic = activityData.mostActiveTopics[0];
        suggestions.push({
          id: `insight-${Date.now()}-2`,
          type: 'insights',
          title: 'נושא העבודה העיקרי',
          description: `אתה מבלה ${Math.round(topTopic.percentage)}% מהזמן שלך ב-${topTopic.topic.name}.`,
          actionable: `שקול להגדיר זמן מוגבל לנושא זה כדי לאזן את העבודה שלך`,
          priority: 'medium',
          confidence: 0.8,
          createdAt: new Date().toISOString(),
          isRead: false,
          isApplied: false
        });
      }

      // Work pattern insights
      if (activityData.workPatterns.includes('morning_person')) {
        suggestions.push({
          id: `insight-${Date.now()}-3`,
          type: 'insights',
          title: 'איש בוקר',
          description: 'אתה נוטה להיות יותר פרודוקטיבי בשעות הבוקר.',
          actionable: 'תזמן משימות מאתגרות בשעות הבוקר המוקדמות',
          priority: 'medium',
          confidence: 0.7,
          createdAt: new Date().toISOString(),
          isRead: false,
          isApplied: false
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating insights suggestions:', error);
      return this.getFallbackInsightsSuggestions();
    }
  }

  private calculateProductivityScore(activityData: UserActivityData): number {
    // Simple productivity score calculation
    let score = 0;
    
    // Time consistency
    const workDays = activityData.weeklyPattern.filter(day => day.totalTime > 0).length;
    score += Math.min(workDays * 10, 40); // Max 40 points for consistency
    
    // Peak hours usage
    if (activityData.peakHours.length > 0) {
      score += 20; // 20 points for having peak hours
    }
    
    // Topic diversity
    const topicCount = activityData.mostActiveTopics.length;
    score += Math.min(topicCount * 5, 20); // Max 20 points for diversity
    
    // Work patterns
    if (activityData.workPatterns.length > 0) {
      score += 20; // 20 points for having work patterns
    }
    
    return Math.min(score, 100); // Cap at 100
  }

  private generateSummarySuggestions(activityData: UserActivityData): string[] {
    const suggestions: string[] = [];
    
    if (activityData.peakHours.length > 0) {
      suggestions.push(`תזמן משימות חשובות בשעות ${activityData.peakHours.join(', ')}`);
    }
    
    if (activityData.workPatterns.includes('morning_person')) {
      suggestions.push('התחל את היום עם המשימות החשובות ביותר');
    }
    
    if (activityData.mostActiveTopics.length > 1) {
      suggestions.push('נסה לאזן את הזמן בין הנושאים השונים');
    }
    
    return suggestions;
  }

  private getFallbackSummary(): UserSummary {
    return {
      totalTimeSpent: 0,
      averageSessionDuration: 0,
      mostProductiveHours: [],
      topTopics: [],
      weeklyPattern: [],
      productivityScore: 0,
      suggestions: [
        'התחל לעקוב אחר הזמן שלך כדי לקבל תובנות',
        'צור נושאים שונים לסיווג הפעילויות שלך',
        'עקוב אחר הסשנים שלך באופן קבוע'
      ]
    };
  }

  private getFallbackInsightsSuggestions(): AISuggestion[] {
    return [
      {
        id: `fallback-insight-${Date.now()}-1`,
        type: 'insights',
        title: 'התחל לעקוב אחר הזמן',
        description: 'עקוב אחר הסשנים שלך כדי לקבל תובנות על דפוסי העבודה שלך.',
        actionable: 'התחל לעקוב אחר הזמן שלך על פעילויות שונות',
        priority: 'high',
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      },
      {
        id: `fallback-insight-${Date.now()}-2`,
        type: 'insights',
        title: 'סווג את הפעילויות שלך',
        description: 'צור נושאים שונים לסיווג הפעילויות שלך ולקבלת תובנות טובות יותר.',
        actionable: 'צור נושאים כמו "עבודה", "לימודים", "פרויקטים" וכו\'',
        priority: 'medium',
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        isRead: false,
        isApplied: false
      }
    ];
  }
}

// Lazy initialization of AI suggestions service
let _aiSuggestionsService: AISuggestionsService | null = null;

export function getAISuggestionsService(): AISuggestionsService | null {
  if (!_aiSuggestionsService) {
    try {
      _aiSuggestionsService = new AISuggestionsService();
      console.log('✅ AI Suggestions service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize AI Suggestions service:', error);
      return null;
    }
  }
  return _aiSuggestionsService;
}

// For backward compatibility
export const aiSuggestionsService = new Proxy({} as AISuggestionsService, {
  get(target, prop) {
    const service = getAISuggestionsService();
    if (!service) {
      throw new Error('AI Suggestions service not available');
    }
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});