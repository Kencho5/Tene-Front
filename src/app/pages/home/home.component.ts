import { Component } from '@angular/core';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { homeCards } from '@utils/homeCards';

@Component({
  selector: 'app-home',
  imports: [SharedModule, ImageComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  homeCards = homeCards;
}
