/**
 * Audio utilities for the timer
 */

import timerStartSound from "../assets/sounds/timer-start.mp3";
import timerCompleteSound from "../assets/sounds/timer-complete.mp3";

/**
 * קלאס לניהול השמעת צלילים בממשק
 */
class AudioManager {
  private startSound: HTMLAudioElement;
  private completeSound: HTMLAudioElement;
  
  constructor() {
    // יצירת אלמנטי אודיו והגדרתם
    this.startSound = new Audio(timerStartSound);
    this.completeSound = new Audio(timerCompleteSound);
    
    // טעינה מראש של הצלילים
    this.startSound.load();
    this.completeSound.load();
  }

  /**
   * השמעת צליל לפי סוג
   */
  private playSound(audio: HTMLAudioElement) {
    try {
      // יוצר העתק של האלמנט כדי לאפשר השמעה מרובה וחופפת
      const soundToPlay = audio.cloneNode() as HTMLAudioElement;
      soundToPlay.volume = 0.25; // עוצמת קול מאוזנת
      
      soundToPlay.play().catch(err => {
        console.log("Audio play failed:", err);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  /**
   * השמעת צליל התחלת טיימר
   */
  playTimerStart() {
    this.playSound(this.startSound);
  }

  /**
   * השמעת צליל סיום טיימר
   */
  playTimerComplete() {
    this.playSound(this.completeSound);
  }
}

// ייצוא של מופע יחיד לשימוש בכל הקומפוננטות
export const audioManager = new AudioManager();