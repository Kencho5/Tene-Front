import { Component } from '@angular/core';
import { Image } from '@shared/components/ui/image/image';
import { SharedModule } from '@shared/shared.module';
import { homeCards } from '@utils/homeCards';

@Component({
  selector: 'app-home',
  imports: [SharedModule, Image],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeCards = homeCards;
}
