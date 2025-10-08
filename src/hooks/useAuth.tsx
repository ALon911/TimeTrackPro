import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import apiService from '../services/api';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check if user is logged in
  const { data: user, isLoading: userLoading } = useQuery(
    'currentUser',
    apiService.getCurrentUser,
    {
      retry: false,
      onError: () => {
        // User is not authenticated
      },
    }
  );

  // Login mutation
  const loginMutation = useMutation(
    ({ email, password }: { email: string; password: string }) =>
      apiService.login(email, password),
    {
      onSuccess: async (userData: User) => {
        await AsyncStorage.setItem('authToken', 'dummy-token'); // You'll need to implement proper token handling
        queryClient.setQueryData('currentUser', userData);
        queryClient.invalidateQueries();
      },
    }
  );

  // Logout mutation
  const logoutMutation = useMutation(apiService.logout, {
    onSuccess: () => {
      queryClient.setQueryData('currentUser', null);
      queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    setIsLoading(false);
  }, [userLoading]);

  return {
    user: user || null,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isLoading,
    isLoggingOut: logoutMutation.isLoading,
  };
};


