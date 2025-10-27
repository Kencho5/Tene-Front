import { Component } from '@angular/core';
import { binCards } from '@utils/binCards';

@Component({
  selector: 'app-bins',
  imports: [],
  templateUrl: './bins.component.html',
})
export class BinsComponent {
  binCards = binCards;
}
