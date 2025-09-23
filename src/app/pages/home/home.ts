import { Component } from '@angular/core';
import { Image } from '@shared/components/ui/image/image';
import { homeCards } from '@utils/homeCards';

@Component({
  selector: 'app-home',
  imports: [Image],
  templateUrl: './home.html',
})
export class Home {
  homeCards = homeCards;
}
