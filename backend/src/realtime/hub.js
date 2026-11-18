const { WebSocketServer, WebSocket } = require('ws');
const User = require('../models/user.model');
const { verifyToken } = require('../utils/token');

const WS_PATH = '/ws';
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_MESSAGE_BYTES = 4096;

/**
 * Keeps track of connected WebSocket clients and pushes updates to them.
 *
 * Two kinds of messages:
 *  - public  (broadcast): seat counts, safe for anyone
 *  - private (notifyUser): attendee details, only for the organiser who owns the event
 */
class RealtimeHub {
  constructor() {
    this.wss = null;
    this.heartbeatTimer = null;
  }

  attach(server) {
    this.close();

    this.wss = new WebSocketServer({
      server,
      path: WS_PATH,
      maxPayload: MAX_MESSAGE_BYTES
    });

    this.wss.on('connection', (socket) => this.handleConnection(socket));
    this.wss.on('error', (error) =>
      console.error('WebSocket server error:', error.message)
    );

    this.heartbeatTimer = setInterval(
      () => this.checkHeartbeat(),
      HEARTBEAT_INTERVAL_MS
    );
    this.heartbeatTimer.unref(); // never keep the process alive just for this timer

    return this.wss;
  }

  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.wss) {
      for (const socket of this.wss.clients) {
        socket.terminate();
      }
      this.wss.close();
      this.wss = null;
    }
  }

  // Used when the server is shutting down or being replaced: ask every client to
  // reconnect (code 1001 = "going away"). The new container will accept them.
  closeAll(code = 1001, reason = 'Server restarting') {
    if (!this.wss) return;

    for (const socket of this.wss.clients) {
      socket.close(code, reason);
    }

    // Anything that does not close politely is cut after a moment
    setTimeout(() => {
      if (!this.wss) return;
      for (const socket of this.wss.clients) {
        socket.terminate();
      }
    }, 2000).unref();
  }

  // ---------- Connections ----------
  handleConnection(socket) {
    socket.isAlive = true;
    socket.user = null; // anonymous until it sends a valid token
    socket.authenticating = false;

    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('message', (raw) => {
      void this.handleMessage(socket, raw);
    });
    socket.on('error', () => socket.terminate());
  }

  async handleMessage(socket, raw) {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed input
    }

    if (!message || message.type !== 'auth' || socket.authenticating) {
      return;
    }

    socket.authenticating = true;

    try {
      if (typeof message.token !== 'string') {
        throw new Error('Missing token');
      }

      const payload = verifyToken(message.token);
      const user = await User.findById(payload.sub);

      if (!user) {
        throw new Error('Unknown account');
      }

      socket.user = { id: String(user._id), role: user.role };
      this.send(socket, { type: 'auth:ok', data: { role: user.role } });
    } catch {
      socket.user = null;
      this.send(socket, {
        type: 'auth:error',
        data: { message: 'Invalid or expired token' }
      });
    } finally {
      socket.authenticating = false;
    }
  }

  // Drop connections that stopped answering pings (closed laptop, lost network)
  checkHeartbeat() {
    if (!this.wss) return;

    for (const socket of this.wss.clients) {
      if (!socket.isAlive) {
        socket.terminate();
        continue;
      }

      socket.isAlive = false;
      socket.ping();
    }
  }

  // ---------- Sending ----------
  send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  broadcast(message) {
    if (!this.wss) return;

    const text = JSON.stringify(message);

    for (const socket of this.wss.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(text);
      }
    }
  }

  notifyUser(userId, message) {
    if (!this.wss || !userId) return;

    const id = String(userId);
    const text = JSON.stringify(message);

    for (const socket of this.wss.clients) {
      if (socket.user?.id === id && socket.readyState === WebSocket.OPEN) {
        socket.send(text);
      }
    }
  }

  // A broken socket must never break the HTTP request that triggered the update
  safely(action) {
    try {
      action();
    } catch (error) {
      console.error('Realtime publish failed:', error.message);
    }
  }

  // ---------- Events published by the controllers ----------

  // Public: only published events are announced (no draft details leak)
  publishEventCounts(event) {
    this.safely(() => {
      if (event.status !== 'published') return;

      this.broadcast({
        type: 'event:counts',
        data: {
          eventId: String(event._id),
          registeredCount: event.registeredCount,
          capacity: event.capacity
        }
      });
    });
  }

  publishRegistrationCreated({ registration, event, user }) {
    this.safely(() => {
      this.publishEventCounts(event);
      this.notifyUser(event.createdBy, {
        type: 'registration:created',
        data: this.describe(registration, event, user)
      });
    });
  }

  publishRegistrationCancelled({ registration, event, user }) {
    this.safely(() => {
      this.publishEventCounts(event);
      this.notifyUser(event.createdBy, {
        type: 'registration:cancelled',
        data: this.describe(registration, event, user)
      });
    });
  }

  describe(registration, event, user) {
    return {
      _id: String(registration._id),
      status: registration.status,
      registeredAt: registration.registeredAt,
      cancelledAt: registration.cancelledAt,
      user: { _id: String(user._id), name: user.name, email: user.email },
      event: { _id: String(event._id), title: event.title }
    };
  }
}

module.exports = new RealtimeHub();