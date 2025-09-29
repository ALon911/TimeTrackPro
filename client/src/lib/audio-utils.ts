/**
 * Audio utilities for timer sounds
 */

// Import the custom notification sound
import notificationSound from "../assets/sounds/notification-alert-positive-bell-jam-fx-low-2-00-01.mp3";

/**
 * קלאס לניהול השמעת צלילים בממשק
 */
class AudioManager {
  private audioContext: AudioContext | null = null;
  private soundBuffer: AudioBuffer | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // הרישום לאירועי משתמש לצורך אתחול מערכת השמע
    document.addEventListener('click', () => this.initialize(), { once: true });
    document.addEventListener('keydown', () => this.initialize(), { once: true });
  }

  /**
   * אתחול מערכת השמע - חייב להתבצע אחרי אינטראקציה של המשתמש
   */
  private initialize(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<void>((resolve) => {
      try {
        // יצירת אודיו קונטקסט חדש
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // טעינת הצליל לתוך באפר
        this.loadSound(notificationSound)
          .then(buffer => {
            this.soundBuffer = buffer;
            this.initialized = true;
            console.log("Audio system initialized successfully");
            resolve();
          })
          .catch(err => {
            console.error("Failed to load sounds:", err);
            resolve(); // נמשיך למרות השגיאה
          });
      } catch (error) {
        console.error("Error initializing audio system:", error);
        resolve(); // נמשיך למרות השגיאה
      }
    });

    return this.initializationPromise;
  }

  /**
   * טעינת צליל מקובץ לתוך AudioBuffer
   */
  private async loadSound(soundUrl: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    try {
      const response = await fetch(soundUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      return new Promise((resolve, reject) => {
        this.audioContext!.decodeAudioData(
          arrayBuffer,
          buffer => resolve(buffer),
          error => reject(error)
        );
      });
    } catch (error) {
      console.error("Error loading sound:", error);
      throw error;
    }
  }

  /**
   * השמעת צליל מתוך באפר
   */
  private playBuffer(buffer: AudioBuffer | null) {
    if (!this.audioContext || !buffer) {
      console.log("Cannot play sound: AudioContext or buffer not initialized");
      return;
    }
    
    try {
      // יצירת מקור שמע חדש והגדרת עוצמת קול
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      
      // הגדרת עוצמת קול נמוכה יותר לצליל נעים יותר
      gainNode.gain.value = 0.6;
      
      // חיבור המקור לעוצמת קול ואז לרמקולים
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // הפעלת הצליל
      source.start(0);
    } catch (error) {
      console.error("Audio play failed:", error);
    }
  }

  /**
   * השמעת צליל התחלת טיימר
   */
  playTimerStart() {
    this.initialize().then(() => {
      this.playBuffer(this.soundBuffer);
    });
  }

  /**
   * השמעת צליל סיום טיימר
   */
  playTimerComplete() {
    this.initialize().then(() => {
      this.playBuffer(this.soundBuffer);
    });
  }
}

// ייצוא של מופע יחיד לשימוש בכל הקומפוננטות
export const audioManager = new AudioManager();