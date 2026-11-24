import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import WebSocket from 'ws';
import { CONFIG } from '../config/index';

export interface StompMessagePayload {
  id?: string;
  conversationId?: string;
  senderId?: string;
  content?: string;
  createdAt?: string;
  [key: string]: any;
}

export class StompTestClient {
  private client: Client;
  private wsUrl: string;
  private accessToken?: string;
  private connected: boolean = false;
  private subscriptions: StompSubscription[] = [];

  constructor(wsUrl: string = CONFIG.WS_URL, accessToken?: string) {
    this.wsUrl = wsUrl;
    this.accessToken = accessToken;

    this.client = new Client({
      // Node.js WebSocket factory using 'ws'
      webSocketFactory: () => {
        // ws in Node allows passing custom headers during handshake if needed
        return new WebSocket(this.wsUrl) as any;
      },
      connectHeaders: this.accessToken
        ? {
            Authorization: `Bearer ${this.accessToken}`,
          }
        : {},
      reconnectDelay: 0, // Disable automatic reconnect during testing
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {
        // quiet debug by default
      },
    });
  }

  public setAccessToken(token: string): void {
    this.accessToken = token;
    this.client.connectHeaders = {
      Authorization: `Bearer ${token}`,
    };
  }

  public async connect(timeoutMs: number = CONFIG.WS_TIMEOUT): Promise<void> {
    if (this.connected) return;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.disconnect().catch(() => {});
          reject(
            new Error(
              `STOMP connection timed out after ${timeoutMs}ms to ${this.wsUrl}`
            )
          );
        }
      }, timeoutMs);

      this.client.onConnect = () => {
        if (!settled) {
          settled = true;
          this.connected = true;
          clearTimeout(timer);
          resolve();
        }
      };

      this.client.onStompError = (frame) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(
            new Error(
              `STOMP broker error: ${frame.headers['message'] || 'Unknown'} - ${frame.body}`
            )
          );
        }
      };

      this.client.onWebSocketError = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(
            new Error(`WebSocket connection error: ${JSON.stringify(event)}`)
          );
        }
      };

      this.client.onWebSocketClose = () => {
        this.connected = false;
      };

      this.client.activate();
    });
  }

  public async disconnect(): Promise<void> {
    this.subscriptions.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch {
        // ignore
      }
    });
    this.subscriptions = [];

    if (this.client.active) {
      await this.client.deactivate();
    }
    this.connected = false;
  }

  public subscribe<T = any>(
    destination: string,
    callback: (data: T, raw: IMessage) => void,
    headers: Record<string, string> = {}
  ): StompSubscription {
    if (!this.connected) {
      throw new Error('Cannot subscribe: STOMP client is not connected');
    }

    const sub = this.client.subscribe(
      destination,
      (message: IMessage) => {
        let parsed: any = message.body;
        try {
          parsed = JSON.parse(message.body);
        } catch {
          // If body is plain text, keep as string
        }
        callback(parsed as T, message);
      },
      headers
    );

    this.subscriptions.push(sub);
    return sub;
  }

  public subscribeToConversation<T = any>(
    conversationId: string,
    callback: (message: T, raw: IMessage) => void
  ): StompSubscription {
    return this.subscribe<T>(`/topic/conversation/${conversationId}`, callback);
  }

  public send(
    destination: string,
    body: any,
    headers: Record<string, string> = {}
  ): void {
    if (!this.connected) {
      throw new Error('Cannot send message: STOMP client is not connected');
    }

    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    this.client.publish({
      destination,
      body: payload,
      headers,
    });
  }

  public sendChatMessage(
    conversationId: string,
    content: string,
    headers: Record<string, string> = {}
  ): void {
    this.send(
      '/app/chat.send',
      {
        conversationId,
        content,
      },
      headers
    );
  }

  public async waitForMessage<T = any>(
    destination: string,
    predicate: (msg: T) => boolean = () => true,
    timeoutMs: number = CONFIG.WS_TIMEOUT
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let sub: StompSubscription | null = null;
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (sub) {
            try {
              sub.unsubscribe();
            } catch {
              // ignore
            }
          }
          reject(
            new Error(
              `Timed out after ${timeoutMs}ms waiting for message on destination "${destination}"`
            )
          );
        }
      }, timeoutMs);

      try {
        sub = this.subscribe<T>(destination, (data: T) => {
          try {
            if (predicate(data)) {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (sub) {
                  try {
                    sub.unsubscribe();
                  } catch {
                    // ignore
                  }
                }
                resolve(data);
              }
            }
          } catch (err) {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              if (sub) {
                try {
                  sub.unsubscribe();
                } catch {
                  // ignore
                }
              }
              reject(err);
            }
          }
        });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  public isConnected(): boolean {
    return this.connected && this.client.connected;
  }

  public getRawClient(): Client {
    return this.client;
  }
}

export function createStompClient(
  accessToken?: string,
  wsUrl: string = CONFIG.WS_URL
): StompTestClient {
  return new StompTestClient(wsUrl, accessToken);
}

export default StompTestClient;
