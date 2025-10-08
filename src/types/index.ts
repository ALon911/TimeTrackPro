export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Topic {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  topic_id: number;
  start_time: string;
  end_time?: string;
  duration?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  invited_by: number;
  invited_user_id: number;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
}

export interface TimerState {
  isRunning: boolean;
  startTime?: Date;
  currentTopic?: Topic;
  duration: number;
}

export interface AppTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

