import { Component } from '@angular/core';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-footer',
  imports: [SharedModule],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  titles = ['სერვისები', 'დოკუმენტაცია', 'კომპანია'] as const;

  links: Record<string, { label: string; route: string }[]> = {
    სერვისები: [
      { label: 'მწვანე ურნა', route: '/bins' },
      { label: 'ტენე ქოინები', route: '/coming-soon' },
      { label: 'პროდუქტები', route: '/products' },
      { label: 'გადადნობა', route: '/coming-soon' },
      { label: 'გამომუშავება', route: '/coming-soon' },
    ],
    დოკუმენტაცია: [
      { label: 'წესები და პირობები', route: '/coming-soon' },
      { label: 'ანგარიშსწორება', route: '/coming-soon' },
      { label: 'მიწოდების პირობები', route: '/coming-soon' },
      { label: 'ნივთის დაბრუნება', route: '/coming-soon' },
      { label: 'კონფიდენციალურობა', route: '/coming-soon' },
    ],
    კომპანია: [
      { label: 'ჩვენ შესახებ', route: '/coming-soon' },
      { label: 'ბლოგი', route: '/coming-soon' },
      { label: 'კონტაქტი', route: '/contact' },
    ],
  };
}
