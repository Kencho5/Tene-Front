import {
  Directive,
  ElementRef,
  inject,
  signal,
  afterNextRender,
  DestroyRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appDragScroll]',
  host: {
    '[style.cursor]': 'isDragging() ? "grabbing" : "grab"',
    '[style.user-select]': 'isDragging() ? "none" : "auto"',
    '[style.-webkit-user-drag]': '"none"',
    '(mousedown)': 'onMouseDown($event)',
    '(dragstart)': '$event.preventDefault()',
  },
})
export class DragScrollDirective {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isDragging = signal(false);
  private startX = 0;
  private scrollLeft = 0;
  private hasDragged = false;

  private readonly onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging()) return;
    e.preventDefault();
    const x = e.pageX - this.el.offsetLeft;
    const walk = x - this.startX;
    if (Math.abs(walk) > 3) this.hasDragged = true;
    this.el.scrollLeft = this.scrollLeft - walk;
  };

  private readonly onMouseUp = () => {
    this.isDragging.set(false);
  };

  private readonly onClick = (e: MouseEvent) => {
    if (this.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      this.hasDragged = false;
    }
  };

  onMouseDown(e: MouseEvent) {
    this.isDragging.set(true);
    this.hasDragged = false;
    this.startX = e.pageX - this.el.offsetLeft;
    this.scrollLeft = this.el.scrollLeft;
  }

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(() => {
      this.el.querySelectorAll('img').forEach((img: Element) => {
        (img as HTMLImageElement).draggable = false;
      });

      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
      this.el.addEventListener('click', this.onClick, true);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.el.removeEventListener('click', this.onClick, true);
      });
    });
  }
}
