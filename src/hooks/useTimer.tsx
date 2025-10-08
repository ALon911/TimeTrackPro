import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { TimerState, Topic } from '../types';
import apiService from '../services/api';
import BackgroundTimer from 'react-native-background-timer';
import KeepAwake from 'react-native-keep-awake';

export const useTimer = () => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    duration: 0,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Get active timer from server
  const { data: activeTimer } = useQuery(
    'activeTimer',
    apiService.getActiveTimer,
    {
      refetchInterval: 1000,
      onSuccess: (data) => {
        if (data) {
          setTimerState({
            isRunning: true,
            startTime: new Date(data.startTime),
            currentTopic: data.topic,
            duration: Math.floor((Date.now() - new Date(data.startTime).getTime()) / 1000),
          });
        } else {
          setTimerState({
            isRunning: false,
            duration: 0,
          });
        }
      },
    }
  );

  // Start timer mutation
  const startTimerMutation = useMutation(
    (topicId: number) => apiService.startTimer(topicId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('activeTimer');
        // Guard against undefined in some environments
        try {
          // @ts-ignore
          if (KeepAwake && typeof KeepAwake.activate === 'function') {
            // @ts-ignore
            KeepAwake.activate();
          }
        } catch {}
      },
    }
  );

  // Stop timer mutation
  const stopTimerMutation = useMutation(apiService.stopTimer, {
    onSuccess: () => {
      queryClient.invalidateQueries('activeTimer');
      queryClient.invalidateQueries('timeEntries');
      try {
        // @ts-ignore
        if (KeepAwake && typeof KeepAwake.deactivate === 'function') {
          // @ts-ignore
          KeepAwake.deactivate();
        }
      } catch {}
    },
  });

  // Update timer duration every second
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const startTime = timerState.startTime!.getTime();
        const duration = Math.floor((now - startTime) / 1000);
        
        setTimerState(prev => ({
          ...prev,
          duration,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.startTime]);

  const startTimer = (topic: Topic) => {
    startTimerMutation.mutate(topic.id);
  };

  const stopTimer = () => {
    stopTimerMutation.mutate();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timerState,
    startTimer,
    stopTimer,
    formatDuration,
    isStarting: startTimerMutation.isLoading,
    isStopping: stopTimerMutation.isLoading,
  };
};


