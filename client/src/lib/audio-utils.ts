/**
 * Audio utilities for the timer
 */

// צליל "טינג" מקצועי להתחלת טיימר 
const TIMER_START_SOUND_BASE64 = 'data:audio/wav;base64,UklGRqQDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YYADAACAgICAgICAgICAgICAgICAgICAgICBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uMjIyNjY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+goKChoaGioqKjo6OkpKSlpaWmpqanp6eoqKipqamqqqqrq6usrKytra2urq6vr6+wsLCxsbGysrKzs7O0tLS1tbW2tra3t7e4uLi5ubm6urq7u7u8vLy9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fIyMjJycnKysrLy8vMzMzNzc3Ozs7Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2trb29vc3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7///+AgICAgICAgICAgICAgICAgICAgICAf39/fn5+fX19fHx8e3t7enp6eXl5eHh4d3d3dnZ2dXV1dHR0c3NzcnJycXFxcHBwb29vbm5ubW1tbGxsa2trampqaWlpaGhoZ2dnZmZmZWVlZGRkY2NjYmJiYWFhYGBgX19fXl5eXV1dXFxcW1tbWlpaWVlZWFhYV1dXVlZWVVVVVFRUU1NTUlJSUVFRUFBQT09PTk5OTU1NTExMS0tLSkpKSUlJSEhIR0dHRkZGRUVFREREQ0NDQkJCQUFBQEBAPz8/Pj4+PT09PDw8Ozs7Ojo6OTk5ODg4Nzc3NjY2NTU1NDQ0MzMzMjIyMTExMDAwLy8vLi4uLS0tLCwsKysrKioqKSkpKCgoJycnJiYmJSUlJCQkIyMjIiIiISEhICAgHx8fHh4eHR0dHBwcGxsbGhoaGRkZGBgYFxcXFhYWFRUVFBQUExMTEhISEREREBAQDw8PDg4ODQ0NDAwMCwsLCgoKCQkJCAgIBwcHBgYGBQUFBAQEAwMDAgICAQEBAAAAAP//////////';

// צליל "טינג" מקצועי לסיום הטיימר - ארוך ומלא יותר
const TIMER_COMPLETE_SOUND_BASE64 = 'data:audio/wav;base64,UklGRtQDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAAACABAAZGF0YbADAACBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLjIyMjY2Njo6Oj4+PkJCQkZGRkpKSk5OTlJSUlZWVlpaWl5eXmJiYmZmZmpqam5ubnJycnZ2dnp6en5+foKCgoaGhoqKio6OjpKSkpaWlpqamp6enqKioqampqqqqq6urrKysra2trq6ur6+vsLCwsbGxsrKys7OztLS0tbW1tra2t7e3uLi4ubm5urq6u7u7vLy8vb29vr6+v7+/wMDAwcHBwsLCw8PDxMTExcXFxsbGx8fHyMjIycnJysrKy8vLzMzMzc3Nzs7Oz8/P0NDQ0dHR0tLS09PT1NTU1dXV1tbW19fX2NjY2dnZ2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=';

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
        soundToPlay.volume = 0.5; // הנמכת עוצמת הקול מעט לחוויה נעימה יותר
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