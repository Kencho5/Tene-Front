import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { binCards } from '@utils/binCards';

@Component({
  selector: 'app-bins',
  imports: [SharedModule],
  templateUrl: './bins.component.html',
})
export class BinsComponent {
  binCards = binCards;
}
