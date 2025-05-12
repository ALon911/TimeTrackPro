import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  initialSeconds?: number;
  autoStart?: boolean;
  countDown?: boolean;
}

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  startWithDuration: (durationInMinutes: number) => void;
  stop: () => void;
  reset: () => void;
  formatTime: () => string;
  isCompleted: boolean;
}

export function useTimer({ initialSeconds = 0, autoStart = false, countDown = false }: UseTimerOptions = {}): UseTimerReturn {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isCountDown, setIsCountDown] = useState<boolean>(countDown);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          if (isCountDown) {
            // If countdown and reached zero
            if (prevSeconds <= 1) {
              setIsRunning(false);
              setIsCompleted(true);
              return 0;
            }
            return prevSeconds - 1;
          } else {
            // Regular timer counting up
            return prevSeconds + 1;
          }
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isCountDown]);

  const start = useCallback((): void => {
    setIsCountDown(false); // Default mode is counting up
    setIsCompleted(false);
    setIsRunning(true);
  }, []);

  const startWithDuration = useCallback((durationInMinutes: number): void => {
    // Convert minutes to seconds
    const totalSeconds = durationInMinutes * 60;
    setSeconds(totalSeconds);
    setIsCountDown(true);
    setIsCompleted(false);
    setIsRunning(true);
  }, []);

  const stop = useCallback((): void => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((): void => {
    setIsRunning(false);
    setIsCompleted(false);
    setSeconds(0);
  }, []);

  const formatTime = useCallback((): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [seconds]);

  return { 
    seconds, 
    isRunning, 
    start, 
    startWithDuration, 
    stop, 
    reset, 
    formatTime,
    isCompleted 
  };
}
