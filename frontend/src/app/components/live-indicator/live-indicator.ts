import { Component, computed, inject } from '@angular/core';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-live-indicator',
  template: `
    <span class="live" [class.on]="realtime.status() === 'online'" role="status">
      <span class="dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .live {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px;
        border: 1px solid var(--ink);
        background: var(--white);
        font-family: var(--font-mono);
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .dot {
        width: 8px;
        height: 8px;
        border: 1px solid var(--ink);
        background: var(--white);
      }

      .live.on .dot {
        background: var(--lime);
        animation: blink 2s ease-in-out infinite;
      }

      @keyframes blink {
        50% { opacity: 0.35; }
      }
    `
  ]
})
export class LiveIndicator {
  protected readonly realtime = inject(RealtimeService);

  protected readonly label = computed(() => {
    switch (this.realtime.status()) {
      case 'online':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      default:
        return 'Offline';
    }
  });
}