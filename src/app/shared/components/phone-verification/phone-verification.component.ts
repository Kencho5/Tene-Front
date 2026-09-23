import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PhoneNumberService } from '@core/services/phone-number.service';
import { ToastService } from '@core/services/toast.service';
import { formatPhoneNumber } from '@utils/phone-number';

const CODE_LENGTH = 6;

@Component({
  selector: 'app-phone-verification',
  templateUrl: './phone-verification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneVerificationComponent {
  private readonly phoneNumberService = inject(PhoneNumberService);
  private readonly toastService = inject(ToastService);

  readonly phoneNumber = input.required<string | null>();
  readonly error = input<boolean>(false);
  readonly errorMessage = input<string>('შეიყვანეთ 6-ნიშნა კოდი');
  readonly code = model('');
  readonly codeSent = model(false);

  readonly sending = signal(false);
  readonly digits = signal<string[]>(Array(CODE_LENGTH).fill(''));
  private readonly now = signal(Date.now());
  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('codeBox');

  readonly formattedPhone = computed(() => formatPhoneNumber(this.phoneNumber() ?? ''));

  readonly secondsLeft = computed(() => {
    const phone = this.phoneNumber();
    if (!phone) return 0;
    const availableAt = this.phoneNumberService.resendAvailableAt()[phone] ?? 0;
    return Math.max(0, Math.ceil((availableAt - this.now()) / 1000));
  });

  readonly countdown = computed(() => {
    const s = this.secondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const id = setInterval(() => this.now.set(Date.now()), 1000);
      destroyRef.onDestroy(() => clearInterval(id));
    });

    effect(() => {
      const code = this.code();
      untracked(() => {
        if (code === this.digits().join('')) return;
        this.digits.set(Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? ''));
      });
    });
  }

  sendCode(): void {
    const phone = this.phoneNumber();
    if (!phone || this.sending() || this.secondsLeft() > 0) return;

    this.sending.set(true);
    this.phoneNumberService.sendCode(phone).subscribe({
      next: () => {
        this.sending.set(false);
        this.codeSent.set(true);
        this.now.set(Date.now());
        this.setDigits(Array(CODE_LENGTH).fill(''));
        setTimeout(() => this.focusBox(0));
      },
      error: (error: HttpErrorResponse) => {
        this.sending.set(false);
        if (error.status === 429) {
          this.phoneNumberService.startCooldown(phone);
          this.now.set(Date.now());
        }
        const message = error?.error?.message || 'კოდის გაგზავნა ვერ მოხერხდა';
        this.toastService.add('შეცდომა', message, 5000, 'error');
      },
    });
  }

  onBoxInput(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.replace(/\D/g, '');
    if (value.length > 1) {
      this.fillFrom(index, value);
      return;
    }
    const next = [...this.digits()];
    next[index] = value;
    target.value = value;
    this.setDigits(next);
    if (value && index < CODE_LENGTH - 1) this.focusBox(index + 1);
  }

  onBoxKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      event.preventDefault();
      const next = [...this.digits()];
      next[index - 1] = '';
      this.setDigits(next);
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault();
      this.focusBox(index + 1);
    }
  }

  onBoxPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    const value = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (value) this.fillFrom(index, value);
  }

  private fillFrom(index: number, value: string): void {
    const next = [...this.digits()];
    const chars = value.slice(0, CODE_LENGTH - index).split('');
    chars.forEach((char, offset) => (next[index + offset] = char));
    this.setDigits(next);
    this.focusBox(Math.min(index + chars.length, CODE_LENGTH - 1));
  }

  private setDigits(digits: string[]): void {
    this.digits.set(digits);
    this.code.set(digits.join(''));
  }

  private focusBox(index: number): void {
    const el = this.boxes()[index]?.nativeElement;
    el?.focus();
    el?.select();
  }
}
