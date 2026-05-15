import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import {
  Task,
  TaskCreatePayload,
  TaskMedia,
  TaskMediaType,
  TaskMediaUploadItem,
  TaskPriority,
  TaskState,
  TaskUpdatePayload,
} from '@core/interfaces/admin/tasks.interface';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { SpinnerComponent } from '@shared/components/ui/spinner/spinner.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, forkJoin, mergeMap, of, tap } from 'rxjs';

interface PendingUpload {
  id: string;
  file: File;
  media_type: TaskMediaType;
  previewUrl: string;
  progress: number;
  error?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/webm', 'audio/ogg', 'audio/wav'];
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES];

function classifyType(contentType: string): TaskMediaType | null {
  if (IMAGE_TYPES.includes(contentType)) return 'image';
  if (VIDEO_TYPES.includes(contentType)) return 'video';
  if (AUDIO_TYPES.includes(contentType)) return 'audio';
  return null;
}

@Component({
  selector: 'app-task-editor',
  imports: [SharedModule, FormsModule, DropdownComponent, SpinnerComponent],
  templateUrl: './task-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditorComponent {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly task = input<Task | null>(null);
  readonly initialState = input<TaskState>('todo');

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly title = signal('');
  readonly description = signal('');
  readonly state = signal<TaskState>('todo');
  readonly priority = signal<TaskPriority>('medium');

  readonly savedMedia = signal<TaskMedia[]>([]);
  readonly pending = signal<PendingUpload[]>([]);
  readonly saving = signal(false);
  readonly dragOver = signal(false);

  readonly isEdit = computed(() => this.task() !== null);

  readonly stateOptions: ComboboxItems[] = [
    { label: 'გასაკეთებელი', value: 'todo' },
    { label: 'მიმდინარე', value: 'in_progress' },
    { label: 'შემოწმება', value: 'review' },
    { label: 'შესრულებული', value: 'done' },
  ];

  readonly priorityOptions: ComboboxItems[] = [
    { label: 'დაბალი', value: 'low' },
    { label: 'საშუალო', value: 'medium' },
    { label: 'მაღალი', value: 'high' },
    { label: 'სასწრაფო', value: 'urgent' },
  ];

  readonly acceptList = ALL_TYPES.join(',');

  readonly titleInvalid = computed(() => this.title().trim().length === 0);

  constructor() {
    const t = this.task();
    if (t) {
      this.title.set(t.title);
      this.description.set(t.description ?? '');
      this.state.set(t.state);
      this.priority.set(t.priority);
      this.savedMedia.set(t.media);
    } else {
      this.state.set(this.initialState());
    }
  }

  onTitleInput(e: Event): void {
    this.title.set((e.target as HTMLInputElement).value);
  }

  onDescriptionInput(e: Event): void {
    this.description.set((e.target as HTMLTextAreaElement).value);
  }

  onStateChange(v: string | undefined): void {
    if (v) this.state.set(v as TaskState);
  }

  onPriorityChange(v: string | undefined): void {
    if (v) this.priority.set(v as TaskPriority);
  }

  triggerPicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFilesPicked(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    if (e.dataTransfer?.files) this.addFiles(Array.from(e.dataTransfer.files));
  }

  private addFiles(files: File[]): void {
    const accepted: PendingUpload[] = [];
    for (const file of files) {
      const mediaType = classifyType(file.type);
      if (!mediaType) {
        this.toastService.add(
          'შეცდომა',
          `ფაილის ფორმატი არ არის მხარდაჭერილი: ${file.name}`,
          3000,
          'error',
        );
        continue;
      }
      accepted.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file,
        media_type: mediaType,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      });
    }
    if (accepted.length) this.pending.update((p) => [...p, ...accepted]);
  }

  removePending(id: string): void {
    const item = this.pending().find((p) => p.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    this.pending.update((p) => p.filter((x) => x.id !== id));
  }

  removeSavedMedia(media: TaskMedia): void {
    const task = this.task();
    if (!task) return;
    this.adminService
      .deleteTaskMedia(task.id, media.media_uuid)
      .pipe(
        tap(() => {
          this.savedMedia.update((arr) => arr.filter((m) => m.media_uuid !== media.media_uuid));
          this.toastService.add('წარმატება', 'მედია წაიშალა', 2500, 'success');
        }),
        catchError((err) => {
          this.toastService.add('შეცდომა', err.error?.error || 'ვერ წაიშალა', 3000, 'error');
          return of(null);
        }),
      )
      .subscribe();
  }

  close(): void {
    for (const p of this.pending()) URL.revokeObjectURL(p.previewUrl);
    this.closed.emit();
  }

  save(): void {
    if (this.titleInvalid() || this.saving()) return;
    this.saving.set(true);

    const existing = this.task();
    if (existing) {
      const payload: TaskUpdatePayload = {
        title: this.title().trim(),
        description: this.description(),
        state: this.state(),
        priority: this.priority(),
      };
      this.adminService
        .updateTask(existing.id, payload)
        .pipe(
          tap(() => this.toastService.add('წარმატება', 'დავალება განახლდა', 2500, 'success')),
          catchError((err) => {
            this.toastService.add('შეცდომა', err.error?.error || 'ვერ განახლდა', 3000, 'error');
            return of(null);
          }),
        )
        .subscribe((res) => {
          if (!res) {
            this.saving.set(false);
            return;
          }
          this.uploadPending(existing.id);
        });
    } else {
      const payload: TaskCreatePayload = {
        title: this.title().trim(),
        description: this.description() || null,
        state: this.state(),
        priority: this.priority(),
      };
      this.adminService
        .createTask(payload)
        .pipe(
          catchError((err) => {
            this.toastService.add('შეცდომა', err.error?.error || 'ვერ შეიქმნა', 3000, 'error');
            return of(null);
          }),
        )
        .subscribe((res) => {
          if (!res) {
            this.saving.set(false);
            return;
          }
          this.toastService.add('წარმატება', 'დავალება შეიქმნა', 2500, 'success');
          this.uploadPending(res.id);
        });
    }
  }

  private uploadPending(taskId: number): void {
    const pending = this.pending();
    if (pending.length === 0) {
      this.saving.set(false);
      this.saved.emit();
      return;
    }

    const items: TaskMediaUploadItem[] = pending.map((p) => ({
      media_type: p.media_type,
      content_type: p.file.type,
    }));

    this.adminService
      .getTaskMediaPresignedUrls(taskId, items)
      .pipe(
        mergeMap((res) => {
          const uploads = res.media.map((entry, idx) =>
            this.adminService.uploadToS3(entry.upload_url, pending[idx].file).pipe(
              tap(() => {
                this.pending.update((arr) =>
                  arr.map((p) => (p.id === pending[idx].id ? { ...p, progress: 100 } : p)),
                );
              }),
              catchError(() => {
                this.pending.update((arr) =>
                  arr.map((p) =>
                    p.id === pending[idx].id ? { ...p, error: 'ატვირთვა ვერ მოხერხდა' } : p,
                  ),
                );
                return of(null);
              }),
            ),
          );
          return forkJoin(uploads);
        }),
        catchError((err) => {
          this.toastService.add(
            'შეცდომა',
            err.error?.error || 'მედია ბმულების მიღება ვერ მოხერხდა',
            3000,
            'error',
          );
          return of(null);
        }),
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.toastService.add('წარმატება', 'მედია აიტვირთა', 2500, 'success');
        }
        this.saved.emit();
      });
  }
}
