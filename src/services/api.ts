import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Topic, TimeEntry, Team, TeamMember, TeamInvitation } from '../types';

// Point mobile app to production API
const API_BASE_URL = 'https://timetracker.alonworks.com';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('authToken');
          // Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<User> {
    const response: AxiosResponse<User> = await this.api.post('/api/login', {
      email,
      password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/api/logout');
    await AsyncStorage.removeItem('authToken');
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/api/user');
    return response.data;
  }

  // Topics endpoints
  async getTopics(): Promise<Topic[]> {
    const response: AxiosResponse<Topic[]> = await this.api.get('/api/topics');
    return response.data;
  }

  async createTopic(name: string, color: string): Promise<Topic> {
    const response: AxiosResponse<Topic> = await this.api.post('/api/topics', {
      name,
      color,
    });
    return response.data;
  }

  async updateTopic(id: number, name: string, color: string): Promise<Topic> {
    const response: AxiosResponse<Topic> = await this.api.put(`/api/topics/${id}`, {
      name,
      color,
    });
    return response.data;
  }

  async deleteTopic(id: number): Promise<void> {
    await this.api.delete(`/api/topics/${id}`);
  }

  // Time entries endpoints
  async getTimeEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response: AxiosResponse<TimeEntry[]> = await this.api.get(
      `/api/time-entries?${params.toString()}`
    );
    return response.data;
  }

  async createTimeEntry(
    topicId: number,
    startTime: string,
    endTime?: string,
    description?: string
  ): Promise<TimeEntry> {
    const response: AxiosResponse<TimeEntry> = await this.api.post('/api/time-entries', {
      topic_id: topicId,
      start_time: startTime,
      end_time: endTime,
      description,
    });
    return response.data;
  }

  async updateTimeEntry(
    id: number,
    topicId?: number,
    startTime?: string,
    endTime?: string,
    description?: string
  ): Promise<TimeEntry> {
    const response: AxiosResponse<TimeEntry> = await this.api.put(`/api/time-entries/${id}`, {
      topic_id: topicId,
      start_time: startTime,
      end_time: endTime,
      description,
    });
    return response.data;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await this.api.delete(`/api/time-entries/${id}`);
  }

  // Teams endpoints
  async getTeams(): Promise<Team[]> {
    const response: AxiosResponse<Team[]> = await this.api.get('/api/teams');
    return response.data;
  }

  async createTeam(name: string, description?: string): Promise<Team> {
    const response: AxiosResponse<Team> = await this.api.post('/api/teams', {
      name,
      description,
    });
    return response.data;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    const response: AxiosResponse<TeamMember[]> = await this.api.get(
      `/api/teams/${teamId}/members`
    );
    return response.data;
  }

  async getTeamInvitations(): Promise<TeamInvitation[]> {
    const response: AxiosResponse<TeamInvitation[]> = await this.api.get(
      '/api/team-invitations'
    );
    return response.data;
  }

  async acceptTeamInvitation(invitationId: number): Promise<void> {
    await this.api.post(`/api/team-invitations/${invitationId}/accept`);
  }

  async declineTeamInvitation(invitationId: number): Promise<void> {
    await this.api.post(`/api/team-invitations/${invitationId}/decline`);
  }

  // Timer endpoints
  async startTimer(topicId: number): Promise<{ success: boolean; timerId?: string }> {
    const response = await this.api.post('/api/timer/start', { topic_id: topicId });
    return response.data;
  }

  async stopTimer(): Promise<TimeEntry> {
    const response: AxiosResponse<TimeEntry> = await this.api.post('/api/timer/stop');
    return response.data;
  }

  async getActiveTimer(): Promise<{ topic: Topic; startTime: string } | null> {
    const response = await this.api.get('/api/timer/active');
    return response.data;
  }
}

export default new ApiService();

