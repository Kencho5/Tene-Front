import { Component } from '@angular/core';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-toast',
  imports: [SharedModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
