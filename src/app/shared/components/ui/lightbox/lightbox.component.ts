import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ImageComponent } from '../image/image.component';

export interface LightboxImage {
  id: string;
  src: string;
  alt?: string;
  thumbnailSrc?: string;
}

@Component({
  selector: 'app-lightbox',
  imports: [ImageComponent],
  templateUrl: './lightbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class LightboxComponent {
  private readonly platformId = inject(PLATFORM_ID);

  readonly isOpen = input.required<boolean>();
  readonly images = input.required<LightboxImage[]>();
  readonly activeImageId = input<string | null>(null);

  readonly closed = output<void>();
  readonly activeImageChanged = output<string>();

  readonly imageLoading = signal(true);
  readonly swipeOffset = signal(0);

  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;

  readonly activeIndex = computed(() => {
    const imgs = this.images();
    const id = this.activeImageId();
    if (!id) return 0;
    const idx = imgs.findIndex((img) => img.id === id);
    return idx >= 0 ? idx : 0;
  });

  readonly activeImage = computed(() => {
    const imgs = this.images();
    return imgs[this.activeIndex()] ?? null;
  });

  readonly canGoPrev = computed(() => this.activeIndex() > 0);
  readonly canGoNext = computed(() => this.activeIndex() < this.images().length - 1);

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  goTo(index: number): void {
    const imgs = this.images();
    if (index < 0 || index >= imgs.length) return;
    this.imageLoading.set(true);
    this.activeImageChanged.emit(imgs[index].id);
  }

  goPrev(): void {
    this.goTo(this.activeIndex() - 1);
  }

  goNext(): void {
    this.goTo(this.activeIndex() + 1);
  }

  onImageLoad(): void {
    this.imageLoading.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('[data-lightbox-content]')) return;
    this.close();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isSwiping = false;
  }

  onTouchMove(event: TouchEvent): void {
    const deltaX = event.touches[0].clientX - this.touchStartX;
    const deltaY = event.touches[0].clientY - this.touchStartY;

    if (!this.isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.isSwiping = true;
    }

    if (this.isSwiping) {
      event.preventDefault();
      this.swipeOffset.set(deltaX);
    }
  }

  onTouchEnd(): void {
    const offset = this.swipeOffset();
    const threshold = 50;

    if (offset < -threshold) {
      this.goNext();
    } else if (offset > threshold) {
      this.goPrev();
    }

    this.swipeOffset.set(0);
    this.isSwiping = false;
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowLeft':
        this.goPrev();
        break;
      case 'ArrowRight':
        this.goNext();
        break;
    }
  }
}
