/**
 * Minimal STOMP-over-WebSocket simulator for Playwright, purpose-built for the whiteboard
 * quiz E2E (Lot D2).
 *
 * Why this exists: the collaboratif board transport ({@link StompBoardTransport}) speaks STOMP
 * 1.2 over a **native** WebSocket (`@stomp/rx-stomp`, not SockJS) against
 * `ws://<host>/api/collaboratif/ws/whiteboard`. There is no live backend in the mocked
 * `chromium` Playwright project, and the two existing whiteboard E2E specs stub only REST
 * (`page.route`) — real-time push was never exercised. To drive the quiz lifecycle
 * (`quiz:session:started` / `quiz:updated` / `quiz:session:closed`) and to assert what the
 * server broadcasts to a participant, we intercept the WebSocket with `page.routeWebSocket`
 * and hand-craft the STOMP frames the client expects.
 *
 * Frame contract mirrored from the real transport:
 *  - inbound broadcasts are `{ type, data }` JSON envelopes on `/topic/whiteboard/{boardId}`
 *    (see `StompBoardTransport.dispatch`, which `JSON.parse`s the MESSAGE body and routes by
 *    `envelope.type`, passing `envelope.data` to the handler);
 *  - outbound actions are `{ type, data }` JSON envelopes on `/app/whiteboard/{boardId}/action`
 *    (see `StompBoardTransport.emit`).
 *
 * Origin-agnostic by construction: the URL glob is `**\/api/collaboratif/ws/whiteboard`, never a
 * hardcoded `localhost:8083` host (cf. project memory "Collaboratif E2E : API relative").
 *
 * This is a mock, not a broker: it never proxies to a real server (`connectToServer` is never
 * called), disables heartbeats (`heart-beat:0,0` in CONNECTED), and only understands the handful
 * of client frames the board transport emits (CONNECT / SUBSCRIBE / SEND / DISCONNECT).
 */
import { type Page, type WebSocketRoute } from '@playwright/test';

/** STOMP frame terminator (the NULL octet). */
const NUL = '\x00';

/** An outbound `{ type, data }` action the client published (captured for assertions). */
export interface CapturedSend {
  destination: string;
  type: string;
  data: unknown;
  /** The raw JSON body, so tests can assert byte-for-byte on what left the client. */
  raw: string;
}

interface ParsedFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Parses one raw WebSocket text message into zero or more STOMP frames. A single message can
 * carry several NUL-terminated frames, and bare EOLs between frames are heart-beats (ignored).
 */
function parseFrames(raw: string): ParsedFrame[] {
  const frames: ParsedFrame[] = [];
  for (const part of raw.split(NUL)) {
    // Strip leading heart-beat EOLs before the command line.
    const text = part.replace(/^[\r\n]+/, '');
    if (text.length === 0) {
      continue;
    }
    const sepIdx = text.search(/\r?\n\r?\n/);
    if (sepIdx === -1) {
      const command = text.split(/\r?\n/)[0]?.trim() ?? '';
      if (command) {
        frames.push({ command, headers: {}, body: '' });
      }
      continue;
    }
    const head = text.slice(0, sepIdx);
    const body = text.slice(sepIdx).replace(/^\r?\n\r?\n/, '');
    const headLines = head.split(/\r?\n/);
    const command = headLines.shift()?.trim() ?? '';
    const headers: Record<string, string> = {};
    for (const line of headLines) {
      const idx = line.indexOf(':');
      if (idx > -1) {
        headers[line.slice(0, idx)] = line.slice(idx + 1);
      }
    }
    if (command) {
      frames.push({ command, headers, body });
    }
  }
  return frames;
}

/**
 * Installable STOMP mock. One instance per {@link Page}. Call {@link install} before navigating,
 * then use {@link broadcast} to push server→client broadcasts and inspect {@link sent} /
 * {@link inboundFramesRaw} for assertions.
 */
export class StompMock {
  /** Every `{ type, data }` action the client published, in order. */
  readonly sent: CapturedSend[] = [];
  /** Raw JSON bodies of every broadcast this mock pushed to the client (leak-scan surface). */
  readonly inboundFramesRaw: string[] = [];

  private ws: WebSocketRoute | null = null;
  private readonly subscriptions = new Map<string, string>(); // subscription id -> destination
  private seq = 0;

  /** Installs the WebSocket route. Must be awaited before the page opens the socket. */
  async install(page: Page, urlGlob = '**/api/collaboratif/ws/whiteboard'): Promise<void> {
    await page.routeWebSocket(urlGlob, (ws) => {
      // Never connect to a real server — this is a pure mock.
      this.ws = ws;
      ws.onMessage((message) => {
        const raw = typeof message === 'string' ? message : message.toString();
        for (const frame of parseFrames(raw)) {
          this.handleClientFrame(ws, frame);
        }
      });
    });
  }

  private handleClientFrame(ws: WebSocketRoute, frame: ParsedFrame): void {
    switch (frame.command) {
      case 'CONNECT':
      case 'STOMP':
        // Disable heartbeats (0,0) so the client never drops us for silence.
        ws.send(`CONNECTED\nversion:1.2\nheart-beat:0,0\n\n${NUL}`);
        break;
      case 'SUBSCRIBE':
        this.subscriptions.set(frame.headers['id'] ?? `sub-${this.seq}`, frame.headers['destination'] ?? '');
        break;
      case 'SEND': {
        let type = '';
        let data: unknown;
        try {
          const env = JSON.parse(frame.body) as { type: string; data: unknown };
          type = env.type;
          data = env.data;
        } catch {
          /* non-JSON body — ignore */
        }
        this.sent.push({ destination: frame.headers['destination'] ?? '', type, data, raw: frame.body });
        break;
      }
      case 'DISCONNECT': {
        const receipt = frame.headers['receipt'];
        if (receipt) {
          ws.send(`RECEIPT\nreceipt-id:${receipt}\n\n${NUL}`);
        }
        break;
      }
      default:
        /* ACK/NACK/BEGIN/... not emitted by the board transport — ignore */
        break;
    }
  }

  /** True once the client's CONNECT has been answered and the topic subscribed. */
  hasSubscription(destination: string): boolean {
    for (const dest of this.subscriptions.values()) {
      if (dest === destination) {
        return true;
      }
    }
    return false;
  }

  /**
   * Pushes a `{ type, data }` broadcast to the board topic as a STOMP MESSAGE frame — the exact
   * shape {@link StompBoardTransport.dispatch} demultiplexes. Throws if no client is connected yet.
   */
  broadcast(boardId: string, type: string, data: unknown): void {
    if (!this.ws) {
      throw new Error('StompMock.broadcast called before a client connected');
    }
    const destination = `/topic/whiteboard/${boardId}`;
    let subId = 'sub-0';
    for (const [id, dest] of this.subscriptions) {
      if (dest === destination) {
        subId = id;
      }
    }
    const body = JSON.stringify({ type, data });
    this.inboundFramesRaw.push(body);
    const frame =
      `MESSAGE\nsubscription:${subId}\nmessage-id:m-${this.seq++}\n` +
      `destination:${destination}\ncontent-type:application/json\n\n${body}${NUL}`;
    this.ws.send(frame);
  }

  /** Convenience: the ordered list of action types the client published. */
  sentTypes(): string[] {
    return this.sent.map((s) => s.type);
  }

  /** The last captured send of a given type, or undefined. */
  lastSent(type: string): CapturedSend | undefined {
    return [...this.sent].reverse().find((s) => s.type === type);
  }

  /** Concatenation of every broadcast body — the surface for anti-leak scans. */
  inboundText(): string {
    return this.inboundFramesRaw.join('\n');
  }
}
