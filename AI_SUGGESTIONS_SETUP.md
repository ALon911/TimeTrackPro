# AI Suggestions Setup Guide

This guide will help you set up AI-powered suggestions for your TimeTrackPro application using the Llama 4 Maverick API.

## Features Added

✅ **AI-Powered Suggestions**: Personalized recommendations based on user's time tracking data
✅ **Smart Analysis**: Analyzes work patterns, peak hours, and productivity trends
✅ **Multiple Suggestion Types**: Productivity, time management, work-life balance, and goal setting
✅ **Dashboard Integration**: Suggestions widget on the main dashboard
✅ **Dedicated Page**: Full suggestions page with detailed view
✅ **Mobile Navigation**: Added suggestions link to mobile navigation

## Setup Instructions

### 1. Install Dependencies

The AI suggestions feature requires the `openai` package which has been added to your `package.json`. Run:

```bash
npm install
```

### 2. Get Llama 4 Maverick API Key

1. Visit [https://aimlapi.com/models/llama-4-maverick-api](https://aimlapi.com/models/llama-4-maverick-api)
2. Sign up for an account
3. Get your API key from the dashboard

### 3. Configure Environment Variables

Add the following to your `.env` file:

```env
# AI Suggestions Configuration
LLAMA_API_KEY=your-llama-4-maverick-api-key-here
```

### 4. Database Migration

The AI suggestions feature adds a new table to your database. Run the database migration:

```bash
npm run db:push
```

### 5. Start the Application

```bash
npm run dev
```

## How It Works

### Data Collection
The AI suggestions system analyzes:
- **Time Entries**: Duration, frequency, and patterns
- **Topics**: Most tracked subjects and time distribution
- **Work Patterns**: Peak hours, daily/weekly patterns
- **Productivity Trends**: Session lengths and consistency

### Suggestion Generation
- **Minimum Data**: Requires at least 5 time entries before generating suggestions
- **Cooldown Period**: New suggestions are generated every 24 hours
- **Smart Analysis**: Uses Llama 4 Maverick to analyze patterns and provide personalized recommendations

### Suggestion Types
1. **Productivity**: Tips to improve focus and efficiency
2. **Time Management**: Better scheduling and task organization
3. **Work-Life Balance**: Recommendations for healthy work habits
4. **Goal Setting**: Strategies for achieving objectives

## API Endpoints

- `GET /api/suggestions` - Fetch user's suggestions
- `POST /api/suggestions/generate` - Generate new suggestions
- `PUT /api/suggestions/:id` - Update suggestion (mark as read/applied)
- `DELETE /api/suggestions/:id` - Delete suggestion

## User Interface

### Dashboard Widget
- Shows top 3 suggestions
- Quick actions (mark as applied, generate new)
- Link to full suggestions page

### Suggestions Page
- Full list of all suggestions
- Detailed view with actionable steps
- Filter by type and priority
- Mark as read/applied functionality

## Configuration Options

### AI Service Configuration
You can modify the AI suggestions behavior in `server/ai-suggestions.ts`:

```typescript
// Minimum data points required for suggestions
private readonly MIN_DATA_POINTS = 5;

// Cooldown period between suggestion generation (24 hours)
private readonly SUGGESTION_COOLDOWN = 24 * 60 * 60 * 1000;
```

### Suggestion Types
The system supports four types of suggestions:
- `productivity` - Focus and efficiency tips
- `time_management` - Scheduling and organization
- `work_life_balance` - Healthy work habits
- `goal_setting` - Achievement strategies

## Privacy & Security

- **User Data**: All analysis is done locally on your server
- **API Calls**: Only suggestion text is sent to the AI service
- **No Personal Data**: No sensitive information is shared with external services
- **User Control**: Users can delete suggestions and control their data

## Troubleshooting

### Common Issues

1. **No Suggestions Generated**
   - Ensure user has at least 5 time entries
   - Check API key configuration
   - Verify database connection

2. **API Errors**
   - Verify LLAMA_API_KEY is set correctly
   - Check API quota and billing
   - Ensure network connectivity

3. **Database Errors**
   - Run `npm run db:push` to update schema
   - Check database permissions
   - Verify SQLite file exists

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=ai-suggestions
```

## Cost Considerations

- **API Usage**: Llama 4 Maverick charges per token
- **Frequency**: Suggestions generated once per day per user
- **Optimization**: System uses efficient prompts to minimize costs

## Future Enhancements

Potential improvements for the AI suggestions system:
- Machine learning model training on user feedback
- Integration with calendar systems
- Team-based suggestions for collaborative work
- Advanced analytics and reporting
- Custom suggestion templates

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure database schema is up to date
4. Test API connectivity with the AI service

The AI suggestions feature is designed to be helpful and non-intrusive, providing value to users while respecting their privacy and data.
