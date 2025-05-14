import { useState, useEffect, useRef, useCallback } from 'react';
import { audioManager } from '@/lib/audio-utils';

interface UseTimerOptions {
  initialSeconds?: number;
  autoStart?: boolean;
  countDown?: boolean;
}

interface UseTimerReturn {
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  startWithDuration: (durationInMinutes: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: () => string;
  isCompleted: boolean;
}

export function useTimer({ initialSeconds = 0, autoStart = false, countDown = false }: UseTimerOptions = {}): UseTimerReturn {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isCountDown, setIsCountDown] = useState<boolean>(countDown);
  const [isPaused, setIsPaused] = useState<boolean>(false);
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
              // השמעת צליל סיום
              audioManager.playTimerComplete();
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
    // השמעת צליל התחלה
    audioManager.playTimerStart();
  }, []);

  const pause = useCallback((): void => {
    if (isRunning) {
      setIsRunning(false);
      setIsPaused(true);
    }
  }, [isRunning]);
  
  const resume = useCallback((): void => {
    if (isPaused) {
      setIsRunning(true);
      setIsPaused(false);
    }
  }, [isPaused]);
  
  const stop = useCallback((): void => {
    setIsRunning(false);
    setIsPaused(false);
    setIsCompleted(false);
    // Just stop the timer without resetting
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
    setSeconds,
    isRunning,
    isPaused,
    start, 
    startWithDuration, 
    stop,
    pause,
    resume,
    reset, 
    formatTime,
    isCompleted 
  };
}
