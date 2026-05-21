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
      title: 'Tene — USB კაბელები, დამტენები და ტექნიკა | ონლაინ მაღაზია',
      description:
        'Tene — ქართული USB კაბელები, დამტენები, ყურსასმენები, მობილურები და აქსესუარები. ოფიციალური გარანტია, უფასო მიწოდება თბილისში 100₾+ შეკვეთაზე.',
      url: 'https://tene.ge',
      type: 'website',
      keywords:
        'USB კაბელი, Type-C კაბელი, Lightning კაბელი, დამტენი, ყურსასმენი, ტექნიკის მაღაზია თბილისი, ონლაინ მაღაზია საქართველო, Tene',
    });

    this.schemaService.addWebsiteSchema({
      name: 'Tene',
      url: 'https://tene.ge',
    });

    this.schemaService.addOrganizationSchema({
      name: 'Tene',
      url: 'https://tene.ge',
      logo: 'https://tene.ge/logo.svg',
      description:
        'ქართული ბრენდი Tene — USB კაბელები, დამტენები და ტექნიკა. მაღაზიები თბილისში, ბათუმში, ქუთაისში, რუსთავსა და ფოთში.',
      address: { locality: 'Tbilisi', country: 'GE' },
      contactPoint: { telephone: '+995', contactType: 'customer service', areaServed: 'GE' },
      sameAs: [
        'https://www.facebook.com/tene.ge',
        'https://www.instagram.com/tene.ge',
        'https://www.tiktok.com/@tene.ge',
      ],
    });
  }
}
