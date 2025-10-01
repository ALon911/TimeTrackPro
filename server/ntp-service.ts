import axios from 'axios';

// NTP servers for time synchronization
const NTP_SERVERS = [
  'time.google.com',
  'time.cloudflare.com', 
  'pool.ntp.org',
  'time.nist.gov'
];

interface NTPResponse {
  timestamp: number;
  server: string;
  offset: number; // milliseconds difference from local time
}

class NTPService {
  private static instance: NTPService;
  private serverOffset: number = 0;
  private lastSync: number = 0;
  private syncInterval: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.syncTime();
    // Sync every 5 minutes
    setInterval(() => this.syncTime(), this.syncInterval);
  }

  public static getInstance(): NTPService {
    if (!NTPService.instance) {
      NTPService.instance = new NTPService();
    }
    return NTPService.instance;
  }

  /**
   * Get synchronized time from NTP server
   */
  public async getSyncTime(): Promise<number> {
    // If we haven't synced recently, try to sync now
    if (Date.now() - this.lastSync > this.syncInterval) {
      await this.syncTime();
    }
    
    return Date.now() + this.serverOffset;
  }

  /**
   * Get synchronized time as Date object
   */
  public async getSyncDate(): Promise<Date> {
    const syncTime = await this.getSyncTime();
    return new Date(syncTime);
  }

  /**
   * Get synchronized time as ISO string
   */
  public async getSyncISOString(): Promise<string> {
    const syncDate = await this.getSyncDate();
    return syncDate.toISOString();
  }

  /**
   * Sync with NTP server
   */
  private async syncTime(): Promise<void> {
    for (const server of NTP_SERVERS) {
      try {
        const response = await this.queryNTPServer(server);
        if (response) {
          this.serverOffset = response.offset;
          this.lastSync = Date.now();
          console.log(`🕐 NTP sync successful with ${server}, offset: ${response.offset}ms`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ NTP sync failed with ${server}:`, error);
      }
    }
    
    console.warn('⚠️ All NTP servers failed, using local time');
  }

  /**
   * Query NTP server for time
   */
  private async queryNTPServer(server: string): Promise<NTPResponse | null> {
    try {
      const startTime = Date.now();
      
      // Use HTTP time service (simpler than NTP protocol)
      const response = await axios.get(`https://${server}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'TimeTrackPro/1.0'
        }
      });
      
      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      
      // Get server time from response headers
      const serverTimeHeader = response.headers['date'];
      if (!serverTimeHeader) {
        throw new Error('No date header in response');
      }
      
      const serverTime = new Date(serverTimeHeader).getTime();
      const localTime = startTime + (roundTripTime / 2); // Estimate server time
      const offset = serverTime - localTime;
      
      return {
        timestamp: serverTime,
        server,
        offset
      };
    } catch (error) {
      throw new Error(`NTP query failed: ${error}`);
    }
  }

  /**
   * Get current server offset
   */
  public getOffset(): number {
    return this.serverOffset;
  }

  /**
   * Check if time is synced
   */
  public isSynced(): boolean {
    return Date.now() - this.lastSync < this.syncInterval;
  }
}

export const ntpService = NTPService.getInstance();

// Helper functions for easy use
export async function getSyncTime(): Promise<number> {
  return await ntpService.getSyncTime();
}

export async function getSyncDate(): Promise<Date> {
  return await ntpService.getSyncDate();
}

export async function getSyncISOString(): Promise<string> {
  return await ntpService.getSyncISOString();
}

export function getSyncTimeSync(): number {
  return Date.now() + ntpService.getOffset();
}

export function getSyncDateSync(): Date {
  return new Date(getSyncTimeSync());
}

export function getSyncISOStringSync(): string {
  return getSyncDateSync().toISOString();
}
