import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, switchMap, tap } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { CompressImageService } from '@core/services/compress-image.service';
import {
  Slider,
  SliderImageVariant,
  SliderRequest,
} from '@core/interfaces/admin/sliders.interface';

interface ImageSlot {
  variant: SliderImageVariant;
  label: string;
  hint: string;
  aspect: string;
  maxWidth: number;
  maxHeight: number;
}

@Component({
  selector: 'app-admin-sliders',
  imports: [SharedModule],
  templateUrl: './admin-sliders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSlidersComponent {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private readonly compressImageService = inject(CompressImageService);

  readonly imageSlots: ImageSlot[] = [
    {
      variant: 'desktop',
      label: 'Web / Desktop',
      hint: 'რეკომენდებული: 1903 × 818',
      aspect: 'aspect-[1903/818]',
      maxWidth: 2560,
      maxHeight: 1280,
    },
    {
      variant: 'mobile',
      label: 'Mobile',
      hint: 'რეკომენდებული: 1265 × 1045',
      aspect: 'aspect-[1265/1045]',
      maxWidth: 1600,
      maxHeight: 1600,
    },
  ];

  readonly sliders = rxResource({
    defaultValue: [] as Slider[],
    stream: () => this.adminService.getSliders(),
  });

  readonly busy = signal<ReadonlySet<string>>(new Set());
  readonly expanded = signal<ReadonlySet<number>>(new Set());
  readonly isCreating = signal(false);
  readonly sliderToDelete = signal<number | null>(null);

  isBusy(key: string): boolean {
    return this.busy().has(key);
  }

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  toggleExpanded(id: number): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  imageUrl(slider: Slider, variant: SliderImageVariant): string | null {
    return variant === 'desktop' ? slider.desktop_image_url : slider.mobile_image_url;
  }

  createSlider(): void {
    this.isCreating.set(true);
    this.run(
      'create',
      this.adminService
        .createSlider({ title: null, link_url: null, enabled: true })
        .pipe(tap((slider) => this.toggleExpanded(slider.id))),
      'სლაიდერი დაემატა',
      'სლაიდერის დამატება ვერ მოხერხდა',
      () => this.isCreating.set(false),
    );
  }

  updateField(slider: Slider, field: 'title' | 'link_url', event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim() || null;
    if (value === slider[field]) return;
    this.save(slider, { [field]: value });
  }

  toggleEnabled(slider: Slider): void {
    this.save(slider, { enabled: !slider.enabled });
  }

  private save(slider: Slider, changes: Partial<SliderRequest>): void {
    const payload: SliderRequest = {
      title: slider.title,
      link_url: slider.link_url,
      enabled: slider.enabled,
      ...changes,
    };
    this.run(
      `save:${slider.id}`,
      this.adminService.updateSlider(slider.id, payload),
      'ცვლილება შენახულია',
      'შენახვა ვერ მოხერხდა',
    );
  }

  move(slider: Slider, direction: 'up' | 'down'): void {
    this.run(
      `move:${slider.id}`,
      this.adminService.moveSlider(slider.id, direction),
      null,
      'რიგის შეცვლა ვერ მოხერხდა',
    );
  }

  async onImageSelect(slider: Slider, slot: ImageSlot, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastService.add('შეცდომა', 'გთხოვთ აირჩიოთ მხოლოდ სურათი', 3000, 'error');
      return;
    }

    const key = `${slider.id}:${slot.variant}`;
    this.setBusy(key, true);

    let compressed: File;
    try {
      compressed = await this.compressImageService.compressImage(
        file,
        0.85,
        slot.maxWidth,
        slot.maxHeight,
        'image/webp',
      );
    } catch {
      this.setBusy(key, false);
      this.toastService.add('შეცდომა', 'სურათის შეკუმშვა ვერ მოხერხდა', 3000, 'error');
      return;
    }

    this.setBusy(key, false);
    this.run(
      key,
      this.adminService
        .getSliderImagePresignedUrl(slider.id, {
          variant: slot.variant,
          content_type: compressed.type,
        })
        .pipe(switchMap((res) => this.adminService.uploadToS3(res.upload_url, compressed))),
      'სურათი აიტვირთა',
      'სურათის ატვირთვა ვერ მოხერხდა',
    );
  }

  removeImage(slider: Slider, variant: SliderImageVariant): void {
    this.run(
      `${slider.id}:${variant}`,
      this.adminService.deleteSliderImage(slider.id, variant),
      'სურათი წაიშალა',
      'სურათის წაშლა ვერ მოხერხდა',
    );
  }

  confirmDelete(): void {
    const id = this.sliderToDelete();
    if (id === null) return;
    this.sliderToDelete.set(null);
    this.run(
      `delete:${id}`,
      this.adminService.deleteSlider(id),
      'სლაიდერი წაიშალა',
      'სლაიდერის წაშლა ვერ მოხერხდა',
    );
  }

  private setBusy(key: string, value: boolean): void {
    this.busy.update((set) => {
      const next = new Set(set);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  private run(
    key: string,
    request: Observable<unknown>,
    successMessage: string | null,
    errorMessage: string,
    done?: () => void,
  ): void {
    this.setBusy(key, true);
    request.subscribe({
      next: () => {
        if (successMessage) {
          this.toastService.add('წარმატება', successMessage, 3000, 'success');
        }
      },
      error: (error) => {
        this.setBusy(key, false);
        done?.();
        this.toastService.add('შეცდომა', error.error?.message || errorMessage, 4000, 'error');
        this.sliders.reload();
      },
      complete: () => {
        this.setBusy(key, false);
        done?.();
        this.sliders.reload();
      },
    });
  }
}
