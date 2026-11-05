import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AdminNavIcon } from './admin-nav';

@Component({
  selector: 'app-admin-nav-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        @switch (icon()) {
          @case ('analytics') {
            <path d="M2.25 2.25v9.5c0 .83.67 1.5 1.5 1.5h10" />
            <path d="m5.25 9.5 2.5-2.75 2 2 3.5-4" />
          }
          @case ('orders') {
            <path d="M3.25 1.75h9.5v12.5l-2.37-1.25L8 14.25 5.62 13l-2.37 1.25V1.75Z" />
            <path d="M5.75 5.25h4.5M5.75 8.25h4.5" />
          }
          @case ('users') {
            <circle cx="8" cy="5" r="2.75" />
            <path d="M2.75 14c.5-2.6 2.6-4.25 5.25-4.25s4.75 1.65 5.25 4.25" />
          }
          @case ('payment-link') {
            <path d="M6.75 9.25a2.75 2.75 0 0 0 3.9 0l2.1-2.1a2.75 2.75 0 0 0-3.9-3.9l-.6.6" />
            <path d="M9.25 6.75a2.75 2.75 0 0 0-3.9 0l-2.1 2.1a2.75 2.75 0 0 0 3.9 3.9l.6-.6" />
          }
          @case ('checkout') {
            <path d="M1.25 1.75h1.9l1.6 8.25h7.5l1.5-5.75H3.95" />
            <circle cx="5.5" cy="13.25" r=".9" />
            <circle cx="11.75" cy="13.25" r=".9" />
          }
          @case ('products') {
            <path d="M8 1.75 13.75 4.5v7L8 14.25 2.25 11.5v-7L8 1.75Z" />
            <path d="M2.25 4.5 8 7.25l5.75-2.75M8 7.25v7" />
          }
          @case ('top-products') {
            <path d="m8 1.75 1.9 3.85 4.25.62-3.08 3 .73 4.23L8 11.45l-3.8 2 .73-4.23-3.08-3 4.25-.62L8 1.75Z" />
          }
          @case ('categories') {
            <rect x="2" y="2" width="5" height="5" rx="1.25" />
            <rect x="9" y="2" width="5" height="5" rx="1.25" />
            <rect x="2" y="9" width="5" height="5" rx="1.25" />
            <rect x="9" y="9" width="5" height="5" rx="1.25" />
          }
          @case ('brands') {
            <path d="M1.75 2.25v4.6c0 .4.16.78.44 1.06l5.9 5.9a1.5 1.5 0 0 0 2.12 0l3.6-3.6a1.5 1.5 0 0 0 0-2.12l-5.9-5.9a1.5 1.5 0 0 0-1.06-.44h-4.6a.5.5 0 0 0-.5.5Z" />
            <circle cx="5" cy="5" r=".9" />
          }
          @case ('cable-specs') {
            <path d="M5.5 1.75v3M10.5 1.75v3M3.75 4.75h8.5v2.5a4.25 4.25 0 0 1-8.5 0v-2.5ZM8 11.5v2.75" />
          }
          @case ('blogs') {
            <path d="M3.25 2.75c0-.55.45-1 1-1h7.5c.55 0 1 .45 1 1v10.5c0 .55-.45 1-1 1h-7.5c-.55 0-1-.45-1-1V2.75Z" />
            <path d="M5.75 5h4.5M5.75 8h4.5M5.75 11h2.5" />
          }
          @case ('sliders') {
            <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
            <path d="m1.75 11 3.5-3.25 2.75 2.5 2-1.75 4.25 3.5" />
            <circle cx="10.5" cy="6" r=".9" />
          }
          @case ('tasks') {
            <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="2" />
            <path d="m5 8 2 2 4-4" />
          }
          @case ('store') {
            <path d="M2.5 7v6.25c0 .55.45 1 1 1h9c.55 0 1-.45 1-1V7" />
            <path d="M1.75 4.5 3 1.75h10l1.25 2.75a2 2 0 0 1-4.08.42 2.1 2.1 0 0 1-4.34 0 2 2 0 0 1-4.08-.42Z" />
            <path d="M6.25 14.25v-3.5h3.5v3.5" />
          }
        }
      </g>
    </svg>
  `,
})
export class AdminNavIconComponent {
  readonly icon = input.required<AdminNavIcon>();
}
