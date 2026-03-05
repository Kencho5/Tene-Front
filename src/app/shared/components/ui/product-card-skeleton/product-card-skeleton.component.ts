import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-product-card-skeleton',
  imports: [],
  templateUrl: './product-card-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes shimmer {
      0% { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }

    .shimmer {
      background: linear-gradient(
        90deg,
        var(--color-platinum-10) 0%,
        var(--color-platinum-20) 40%,
        var(--color-platinum-10) 80%
      );
      background-size: 800px 100%;
      animation: shimmer 1.6s ease-in-out infinite;
    }
  `,
})
export class ProductCardSkeletonComponent {}
