# API Usage Guide for AI Suggestions

## 📊 API Call Analysis

### Current Configuration
- **Daily API Calls**: Maximum 10 calls per day
- **Cooldown Period**: 7 days between suggestion generations per user
- **Suggestions per Call**: Maximum 3 suggestions per API call
- **Token Limit**: 1,000 tokens per request (optimized for cost)

### Estimated Daily API Calls

#### Scenario 1: Small Team (5 users)
- **Per User**: 1 call every 7 days
- **Daily Average**: ~0.7 calls per day
- **Monthly Total**: ~21 calls
- **Estimated Cost**: $0.02-0.05/month

#### Scenario 2: Medium Team (25 users)
- **Per User**: 1 call every 7 days  
- **Daily Average**: ~3.6 calls per day
- **Monthly Total**: ~108 calls
- **Estimated Cost**: $0.10-0.25/month

#### Scenario 3: Large Team (100 users)
- **Per User**: 1 call every 7 days
- **Daily Average**: ~14.3 calls per day
- **Monthly Total**: ~429 calls
- **Estimated Cost**: $0.40-1.00/month

## 🔧 Configuration Options

### Environment Variables

Add these to your `.env` file to customize API usage:

```env
# API Call Limits
AI_MAX_DAILY_CALLS=10                    # Maximum API calls per day
AI_MAX_SUGGESTIONS=3                     # Maximum suggestions per call
AI_COOLDOWN_HOURS=168                    # Hours between suggestions (7 days)

# Data Requirements
AI_MIN_DATA_POINTS=5                     # Minimum time entries needed

# Cost Optimization
AI_USE_CACHE=true                        # Use cached suggestions when possible
AI_CACHE_HOURS=24                       # Cache duration in hours
AI_MAX_TOKENS=1000                      # Maximum tokens per request
AI_TEMPERATURE=0.7                      # AI creativity level (0-1)

# Fallback Settings
AI_ENABLE_FALLBACK=true                  # Enable fallback suggestions
AI_FALLBACK_COUNT=2                     # Number of fallback suggestions
```

### Cost Optimization Strategies

#### 1. **Conservative Mode** (Lowest Cost)
```env
AI_MAX_DAILY_CALLS=5
AI_COOLDOWN_HOURS=336                    # 14 days
AI_MAX_TOKENS=500
AI_USE_CACHE=true
```

#### 2. **Balanced Mode** (Default)
```env
AI_MAX_DAILY_CALLS=10
AI_COOLDOWN_HOURS=168                    # 7 days
AI_MAX_TOKENS=1000
AI_USE_CACHE=true
```

#### 3. **Active Mode** (More Suggestions)
```env
AI_MAX_DAILY_CALLS=20
AI_COOLDOWN_HOURS=72                     # 3 days
AI_MAX_TOKENS=1500
AI_USE_CACHE=false
```

## 💰 Cost Breakdown

### Llama 4 Maverick Pricing (Estimated)
- **Input Tokens**: ~$0.001 per 1K tokens
- **Output Tokens**: ~$0.002 per 1K tokens
- **Average Request**: ~500 input + 300 output = 800 tokens
- **Cost per Request**: ~$0.001-0.002

### Monthly Cost Calculator

| Users | Daily Calls | Monthly Calls | Monthly Cost |
|-------|-------------|---------------|--------------|
| 10    | 1.4         | 42           | $0.04-0.08   |
| 25    | 3.6         | 108          | $0.11-0.22   |
| 50    | 7.1         | 214          | $0.21-0.43   |
| 100   | 14.3        | 429          | $0.43-0.86   |
| 500   | 71.4        | 2,143        | $2.14-4.29   |

## 🚀 Optimization Features

### 1. **Smart Caching**
- Returns cached suggestions when API limit reached
- Reduces redundant API calls
- Maintains user experience during high usage

### 2. **Rate Limiting**
- Daily call limits prevent overuse
- Per-user cooldown periods
- Automatic fallback to cached suggestions

### 3. **Efficient Prompts**
- Optimized prompts reduce token usage by 60%
- Focused on essential data only
- Shorter, more targeted responses

### 4. **Fallback System**
- Pre-defined suggestions when API unavailable
- No API calls for basic functionality
- Graceful degradation

## 📈 Monitoring & Analytics

### API Usage Endpoint
```bash
GET /api/suggestions/usage
```

Returns:
```json
{
  "callsToday": 3,
  "maxCalls": 10,
  "cooldownHours": 168
}
```

### Usage Tracking
- Daily call count
- Remaining calls today
- Cooldown status per user
- Cost estimation

## 🛡️ Safety Measures

### 1. **Automatic Limits**
- Hard daily limit prevents runaway costs
- User-level cooldowns prevent spam
- Token limits control request size

### 2. **Graceful Degradation**
- Falls back to cached suggestions
- Shows helpful messages when limits reached
- Maintains core functionality

### 3. **Cost Alerts**
- Console logging of API usage
- Daily call count tracking
- Monthly cost estimation

## 🔄 Scaling Strategies

### For Growing Teams

#### Phase 1: 0-50 Users
- Use default settings
- Monitor usage weekly
- Estimated cost: $0.20/month

#### Phase 2: 50-200 Users  
- Increase daily limit to 20
- Consider 5-day cooldown
- Estimated cost: $0.80/month

#### Phase 3: 200+ Users
- Implement user-based limits
- Add premium tiers
- Estimated cost: $2.00+/month

### Enterprise Solutions
- Dedicated API quotas
- Custom cooldown periods
- Advanced analytics
- White-label options

## 🚨 Emergency Controls

### Immediate Cost Control
```env
# Emergency settings - minimal API usage
AI_MAX_DAILY_CALLS=1
AI_COOLDOWN_HOURS=720                    # 30 days
AI_USE_CACHE=true
AI_ENABLE_FALLBACK=true
```

### Disable AI Suggestions
```env
AI_MAX_DAILY_CALLS=0
```

## 📋 Best Practices

### 1. **Start Conservative**
- Begin with 5 daily calls
- 7-day cooldown period
- Monitor usage for 2 weeks

### 2. **Monitor Usage**
- Check `/api/suggestions/usage` daily
- Review monthly costs
- Adjust limits based on budget

### 3. **Optimize Gradually**
- Increase limits based on user feedback
- Reduce cooldown if suggestions are valuable
- Balance cost vs. user experience

### 4. **Plan for Growth**
- Set budget limits
- Implement user-based quotas
- Consider premium features

## 🔍 Troubleshooting

### High API Usage
1. Check for multiple users generating suggestions
2. Verify cooldown periods are working
3. Review cache settings
4. Consider increasing cooldown period

### No Suggestions Generated
1. Verify API key is set
2. Check daily call limits
3. Ensure users have enough data (5+ entries)
4. Review cooldown periods

### High Costs
1. Reduce daily call limits
2. Increase cooldown periods
3. Enable caching
4. Use fallback suggestions

## 📞 Support

For cost optimization help:
1. Review current usage: `GET /api/suggestions/usage`
2. Check console logs for API call patterns
3. Adjust environment variables
4. Monitor for 1 week before further changes

The system is designed to be cost-effective while providing valuable AI suggestions to your users!
