import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-admin-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && closed.emit()' },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div class="bg-platinum-100/30 absolute inset-0" (click)="closed.emit()" aria-hidden="true"></div>
        <form
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (submit)="$event.preventDefault(); submitted.emit()"
          novalidate
          class="relative flex max-h-[92dvh] w-full flex-col rounded-t-xl bg-white shadow-[0_0_0_1px_rgba(33,33,33,0.06),0_16px_48px_rgba(33,33,33,0.16)] sm:rounded-xl"
          [class]="widthClass()"
        >
          <div class="flex items-start justify-between gap-4 px-5 pt-5">
            <div class="min-w-0">
              <h2 class="text-platinum-100 text-base font-semibold">{{ title() }}</h2>
              @if (description()) {
                <p class="text-platinum-60 mt-1 text-sm">{{ description() }}</p>
              }
            </div>
            <button
              type="button"
              (click)="closed.emit()"
              aria-label="დახურვა"
              class="text-platinum-50 hover:text-platinum-90 -mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-neutral-100 sm:size-8"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M12 4 4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ng-content />
          </div>

          @if (submitText()) {
            <div
              class="border-hairline-strong/70 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-neutral-50 px-5 py-3 sm:flex-row sm:justify-end"
            >
              <button
                type="button"
                (click)="closed.emit()"
                class="text-platinum-80 border-hairline-strong/70 inline-flex h-11 items-center justify-center rounded-lg border bg-white px-3.5 text-[15px] font-medium shadow-[0_1px_1px_rgba(33,33,33,0.04)] hover:bg-neutral-50 sm:h-9 sm:text-sm"
              >
                გაუქმება
              </button>
              <button
                type="submit"
                [disabled]="busy()"
                [class]="
                  danger()
                    ? 'bg-valencia-60 hover:bg-valencia-70'
                    : 'bg-green-60 hover:bg-green-70 shadow-[0_1px_1px_rgba(33,33,33,0.08)]'
                "
                class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3.5 text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:text-sm"
              >
                @if (busy()) {
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" class="animate-spin" aria-hidden="true">
                    <path d="M8 2a6 6 0 1 1-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                }
                {{ submitText() }}
              </button>
            </div>
          }
        </form>
      </div>
    }
  `,
})
export class AdminDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly submitText = input<string>('შენახვა');
  readonly busy = input<boolean>(false);
  readonly danger = input<boolean>(false);
  readonly widthClass = input<string>('sm:max-w-[480px]');

  readonly closed = output<void>();
  readonly submitted = output<void>();
}
