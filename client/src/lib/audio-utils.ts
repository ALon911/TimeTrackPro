/**
 * Audio utilities for the timer
 */

// קובץ שמע קטן בפורמט בסיס-64 להשמעת צליל
const TIMER_START_SOUND_BASE64 = 'data:audio/wav;base64,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';

// קובץ צליל גדול יותר בבסיס-64 להשמעת צליל סיום
const TIMER_COMPLETE_SOUND_BASE64 = 'data:audio/wav;base64,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';

/**
 * קלאס לניהול השמעת צלילים בממשק
 */
class AudioManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  
  constructor() {
    // יצירת אלמנטי אודיו וטעינתם מראש
    this.preloadSound('timer-start', TIMER_START_SOUND_BASE64);
    this.preloadSound('timer-complete', TIMER_COMPLETE_SOUND_BASE64);
  }

  /**
   * טעינה מראש של צליל
   */
  private preloadSound(id: string, src: string) {
    const audio = new Audio();
    audio.src = src;
    audio.load();
    this.audioCache.set(id, audio);
  }

  /**
   * השמעת צליל לפי זיהוי
   */
  playSound(id: string) {
    try {
      const audio = this.audioCache.get(id);
      if (audio) {
        // יוצר העתק של האלמנט כדי לאפשר השמעה מרובה וחופפת
        const soundToPlay = audio.cloneNode() as HTMLAudioElement;
        soundToPlay.play().catch(err => {
          console.log("Audio play failed:", err);
        });
      } else {
        console.warn(`Sound with id ${id} not found`);
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }

  /**
   * השמעת צליל התחלת טיימר
   */
  playTimerStart() {
    this.playSound('timer-start');
  }

  /**
   * השמעת צליל סיום טיימר
   */
  playTimerComplete() {
    this.playSound('timer-complete');
  }
}

// ייצוא של מופע יחיד לשימוש בכל הקומפוננטות
export const audioManager = new AudioManager();