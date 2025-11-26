import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-footer',
  imports: [SharedModule],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  titles = ['სერვისები', 'დოკუმენტაცია', 'კომპანია'] as const;

  links: Record<string, string[]> = {
    სერვისები: [
      'მწვანე ურნა',
      'ტენე ქოინები',
      'პროდუქტები',
      'გადადნობა',
      'გამომუშავება',
    ],
    დოკუმენტაცია: [
      'წესები და პირობები',
      'ანგარიშსწორება',
      'მიწოდების პირობები',
      'ნივთის დაბრუნება',
      'კონფიდენციალურობა',
    ],
    კომპანია: ['ჩვენ შესახებ', 'ბლოგი', 'კონტაქტი'],
  };
}
