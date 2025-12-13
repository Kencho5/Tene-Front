import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly title = input<string>('დადასტურება');
  readonly message = input<string>('დარწმუნებული ხართ?');
  readonly confirmText = input<string>('დიახ');
  readonly cancelText = input<string>('არა');
  readonly confirmButtonGradientStart = input<string>('#0ad810');
  readonly confirmButtonGradientEnd = input<string>('#0bb705');

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  getConfirmButtonStyle(): string {
    const start = this.confirmButtonGradientStart();
    const end = this.confirmButtonGradientEnd();
    return `background: linear-gradient(90deg, ${start} 0%, ${end} 35%, ${end} 65%, ${start} 100%);`;
  }
}
