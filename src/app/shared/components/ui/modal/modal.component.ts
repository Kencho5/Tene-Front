import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-modal',
  imports: [SharedModule],
  templateUrl: './modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly isOpen = input.required<boolean>();
  readonly title = input.required<string>();
  readonly cancelText = input.required<string>();
  readonly acceptText = input.required<string>();

  readonly close = output<void>();
  readonly accept = output<void>();

  onClose() {
    this.close.emit();
  }

  onAccept() {
    this.accept.emit();
  }
}
