# TimeTrackPro 🕐

A modern, feature-rich time tracking application built with React, TypeScript, and Express.js. Track your productivity, manage teams, and gain insights into your work patterns.

![TimeTrackPro](https://img.shields.io/badge/TimeTrackPro-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue)
![React](https://img.shields.io/badge/React-18.3.1-blue)

## ✨ Features

### 🎯 Core Time Tracking
- **Smart Timer**: Start, pause, and stop timers with ease
- **Topic-based Tracking**: Organize your time by projects and topics
- **Custom Durations**: Set specific time goals (5min, 20min, 40min, or custom)
- **Background Persistence**: Timers continue running even when switching pages
- **Audio Notifications**: Sound alerts for timer completion

### 📊 Analytics & Insights
- **Weekly Overview**: Visual charts showing your productivity patterns
- **Daily Statistics**: Track your daily progress and trends
- **Topic Distribution**: See which areas you spend the most time on
- **Recent Sessions**: Quick access to your latest work sessions
- **Export to Excel**: Download detailed reports for analysis

### 👥 Team Collaboration
- **Team Management**: Create and manage teams
- **Member Invitations**: Invite team members via email
- **Team Statistics**: View team productivity and member activity
- **Role-based Access**: Different permission levels for team members
- **Cross-team Analytics**: Compare performance across different teams

### 🤖 AI-Powered Features
- **Smart Suggestions**: AI-generated recommendations for better time management
- **Productivity Insights**: Get personalized tips based on your work patterns
- **Intelligent Categorization**: Automatic topic suggestions
- **Work Pattern Analysis**: Understand your most productive hours

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Hebrew RTL Support**: Full right-to-left language support
- **Intuitive Interface**: Clean, modern design with smooth animations
- **Mobile-First**: Optimized for mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite (included)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ALon911/TimeTrackPro.git
   cd TimeTrackPro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DATABASE_URL=sqlite:./db/timetrack.db
   
   # Session Configuration
   SESSION_SECRET=your-session-secret-here
   
   # AI Suggestions Configuration (Required for AI features)
   LLAMA_API_KEY=your-llama-api-key
   
   # Email Configuration (Optional)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=no-reply@yourdomain.com
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   
   # Application URL (Required for invitation links)
   APP_URL=https://your-domain.com
   
   # AI Configuration (Optional - defaults are good)
   AI_COOLDOWN_HOURS=24
   AI_MAX_DAILY_CALLS=10
   AI_USE_CACHE=true
   AI_ENABLE_FALLBACK=true
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

### Project Structure

```
TimeTrackPro/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utility functions
├── server/                 # Express.js backend
│   ├── routes.ts          # API routes
│   ├── auth.ts           # Authentication logic
│   └── database-storage.ts # Database operations
├── shared/                # Shared types and schemas
└── db/                   # SQLite database
```

## 🔧 Configuration

### Database
TimeTrackPro uses SQLite by default, but can be configured for PostgreSQL or other databases by updating the `DATABASE_URL` in your `.env` file.

### Email Setup
For team invitations to work, configure your email settings:

1. **Gmail Setup**:
   - Enable 2-factor authentication
   - Generate an app password
   - Use your Gmail credentials in `.env`

2. **Other Providers**:
   - Update `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE` accordingly

### AI Features
To enable AI-powered suggestions:
1. Get a Llama API key
2. Add it to your `.env` file as `LLAMA_API_KEY`
3. Restart the application

## 📱 Mobile Support

TimeTrackPro is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Optimized for small screens
- Background timer persistence
- Mobile-specific UI adjustments

## 🌍 Internationalization

- **Hebrew RTL Support**: Full right-to-left language support
- **Responsive Layout**: Adapts to different text directions
- **Cultural Considerations**: Hebrew day names and date formats

## 🔒 Security Features

- **Session Management**: Secure user sessions
- **Input Validation**: Zod schema validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Sanitized user inputs
- **CSRF Protection**: Built-in CSRF tokens

## 📈 Performance

- **Optimized Queries**: Efficient database operations
- **Caching**: Smart caching for better performance
- **Lazy Loading**: Components loaded on demand
- **Bundle Optimization**: Minimized JavaScript bundles

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React** - The UI library
- **Express.js** - The backend framework
- **SQLite** - The database
- **Tailwind CSS** - The styling framework
- **Radix UI** - The component library
- **Recharts** - The charting library

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/ALon911/TimeTrackPro/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced reporting features
- [ ] Integration with popular tools (Slack, GitHub, etc.)
- [ ] Offline support
- [ ] Multi-language support
- [ ] Advanced AI features

---

**Made with ❤️ by [ALon911](https://github.com/ALon911)**

*Track your time, boost your productivity!* 🚀
