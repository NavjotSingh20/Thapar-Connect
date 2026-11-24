import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { useAuthStore } from '@/store/useAuthStore';
import { MessageDto } from '@/types';

class StompChatClient {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private pendingCallbacks: Map<string, Set<(message: MessageDto) => void>> = new Map();

  private getBrokerUrl(): string {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.host;
    return `${isHttps ? 'wss:' : 'ws:'}//${host}/ws`;
  }

  public connect(onConnected?: () => void): void {
    if (this.client && this.client.connected) {
      if (onConnected) onConnected();
      return;
    }

    if (this.client && this.client.active) {
      // Already activating, queue onConnected if provided
      if (onConnected) {
        const prevOnConnect = this.client.onConnect;
        this.client.onConnect = (frame) => {
          if (prevOnConnect) prevOnConnect(frame);
          onConnected();
        };
      }
      return;
    }

    const token = useAuthStore.getState().accessToken;

    this.client = new Client({
      brokerURL: this.getBrokerUrl(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      beforeConnect: () => {
        const freshToken = useAuthStore.getState().accessToken;
        if (freshToken && this.client) {
          this.client.connectHeaders = { Authorization: `Bearer ${freshToken}` };
        }
      },
      onConnect: () => {
        // Resubscribe any registered topics
        this.pendingCallbacks.forEach((_callbacks, conversationId) => {
          if (!this.subscriptions.has(conversationId)) {
            this.registerSubscription(conversationId);
          }
        });
        if (onConnected) onConnected();
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame.headers?.message, frame.body);
      },
      onWebSocketClose: () => {
        // Auto-reconnect managed by reconnectDelay
      },
    });

    this.client.activate();
  }

  private registerSubscription(conversationId: string): void {
    if (!this.client || !this.client.connected) return;

    const topic = `/topic/conversation/${conversationId}`;
    const sub = this.client.subscribe(topic, (msg: IMessage) => {
      try {
        const parsed: MessageDto = JSON.parse(msg.body);
        const callbacks = this.pendingCallbacks.get(conversationId);
        if (callbacks) {
          callbacks.forEach((cb) => cb(parsed));
        }
      } catch (err) {
        console.error('Failed to parse STOMP chat message:', err);
      }
    });

    this.subscriptions.set(conversationId, sub);
  }

  public subscribeToConversation(
    conversationId: string,
    callback: (message: MessageDto) => void
  ): () => void {
    if (!this.pendingCallbacks.has(conversationId)) {
      this.pendingCallbacks.set(conversationId, new Set());
    }
    this.pendingCallbacks.get(conversationId)!.add(callback);

    if (this.client && this.client.connected) {
      if (!this.subscriptions.has(conversationId)) {
        this.registerSubscription(conversationId);
      }
    } else {
      this.connect();
    }

    return () => {
      const callbacks = this.pendingCallbacks.get(conversationId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.pendingCallbacks.delete(conversationId);
          const sub = this.subscriptions.get(conversationId);
          if (sub) {
            sub.unsubscribe();
            this.subscriptions.delete(conversationId);
          }
        }
      }
    };
  }

  public sendMessage(conversationId: string, content: string): boolean {
    if (!this.client || !this.client.connected) {
      return false;
    }

    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ conversationId, content }),
    });
    return true;
  }

  public disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.pendingCallbacks.clear();
      this.client.deactivate();
      this.client = null;
    }
  }

  public isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
}

export const stompClient = new StompChatClient();
