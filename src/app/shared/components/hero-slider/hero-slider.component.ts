import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Slider } from '@core/interfaces/admin/sliders.interface';

const AUTOPLAY_INTERVAL_MS = 6000;
const DESKTOP_QUERY = '(min-width: 1024px)';

@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './hero-slider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mouseenter)': 'paused.set(true)',
    '(mouseleave)': 'paused.set(false)',
    '(focusin)': 'paused.set(true)',
    '(focusout)': 'paused.set(false)',
  },
})
export class HeroSliderComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  readonly sliders = input.required<Slider[]>();
  readonly current = signal(0);
  readonly paused = signal(false);
  private timer?: number;

  constructor() {
    afterNextRender(() => {
      const desktop = window.matchMedia(DESKTOP_QUERY);
      this.timer = window.setInterval(() => {
        if (desktop.matches && !this.paused() && !document.hidden && this.sliders().length > 1) {
          this.scrollTo((this.current() + 1) % this.sliders().length);
        }
      }, AUTOPLAY_INTERVAL_MS);
      this.destroyRef.onDestroy(() => this.stopAutoplay());
    });
  }

  isInternal(url: string): boolean {
    return url.startsWith('/');
  }

  onScroll(): void {
    const el = this.track().nativeElement;
    this.current.set(Math.round(el.scrollLeft / el.clientWidth));
  }

  goTo(index: number): void {
    this.stopAutoplay();
    this.scrollTo(index);
  }

  private scrollTo(index: number): void {
    const el = this.track().nativeElement;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }

  private stopAutoplay(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  prev(): void {
    const count = this.sliders().length;
    this.goTo((this.current() - 1 + count) % count);
  }

  next(): void {
    this.goTo((this.current() + 1) % this.sliders().length);
  }
}
