import { Component, inject, OnInit } from '@angular/core';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { homeCards } from '@utils/homeCards';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';

@Component({
  selector: 'app-home',
  imports: [SharedModule, ImageComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);
  homeCards = homeCards;

  ngOnInit(): void {
    this.seoService.setMetaTags({
      title: 'Tene - პირველი ქართული USB კაბელი | ხარისხიანი ტექნიკა და აქსესუარები',
      description:
        'შეიძინე USB კაბელები, დამტენები და ტექნიკა Tene-დან ★ Apple, Anker, Logitech ★ სწრაფი მიწოდება თბილისში ★ ოფიციალური გარანტია ★ 30% ფასდაკლება',
      url: 'https://tene.ge',
      type: 'website',
      keywords:
        'USB კაბელი, Type-C კაბელი, Lightning კაბელი, დამტენი, Apple აქსესუარები, ტექნიკა, თბილისი, საქართველო',
    });

    this.schemaService.addOrganizationSchema({
      name: 'Tene',
      url: 'https://tene.ge',
      logo: 'https://tene.ge/logo.svg',
    });
  }
}
