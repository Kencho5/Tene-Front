import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Task, TaskPriority, TaskState } from '@core/interfaces/admin/tasks.interface';
import { OutsideClickDirective } from '@core/directives/outside-click.directive';
import { SharedModule } from '@shared/shared.module';

const PRIORITY_META: Record<TaskPriority, { label: string; level: number }> = {
  low: { label: 'დაბალი', level: 1 },
  medium: { label: 'საშუალო', level: 2 },
  high: { label: 'მაღალი', level: 3 },
  urgent: { label: 'სასწრაფო', level: 4 },
};

const STATE_DOTS: Record<TaskState, string> = {
  todo: 'bg-platinum-40',
  in_progress: 'bg-blue-500',
  review: 'bg-amber-500',
  done: 'bg-green-60',
};

const STATE_LABELS: Record<TaskState, string> = {
  todo: 'გასაკეთებელი',
  in_progress: 'მიმდინარე',
  review: 'შემოწმება',
  done: 'შესრულებული',
};

@Component({
  selector: 'app-task-card',
  imports: [SharedModule, OutsideClickDirective],
  templateUrl: './task-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  readonly task = input.required<Task>();

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly delete = output<void>();
  readonly stateChange = output<TaskState>();

  readonly menuOpen = signal(false);
  readonly stateOpen = signal(false);

  readonly states: TaskState[] = ['todo', 'in_progress', 'review', 'done'];
  readonly stateLabels = STATE_LABELS;
  readonly stateDots = STATE_DOTS;

  readonly priorityMeta = computed(() => PRIORITY_META[this.task().priority]);

  readonly mediaCount = computed(() => this.task().media.length);
  readonly imageCount = computed(() => this.task().media.filter((m) => m.media_type === 'image').length);
  readonly videoCount = computed(() => this.task().media.filter((m) => m.media_type === 'video').length);
  readonly audioCount = computed(() => this.task().media.filter((m) => m.media_type === 'audio').length);

  readonly firstImage = computed(() => this.task().media.find((m) => m.media_type === 'image'));

  toggleMenu(e: Event): void {
    e.stopPropagation();
    this.menuOpen.update((v) => !v);
    this.stateOpen.set(false);
  }

  toggleState(e: Event): void {
    e.stopPropagation();
    this.stateOpen.update((v) => !v);
    this.menuOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  closeState(): void {
    this.stateOpen.set(false);
  }

  selectState(state: TaskState, e: Event): void {
    e.stopPropagation();
    this.stateOpen.set(false);
    this.stateChange.emit(state);
  }

  onCardClick(): void {
    this.view.emit();
  }

  onEdit(e: Event): void {
    e.stopPropagation();
    this.menuOpen.set(false);
    this.edit.emit();
  }

  onDelete(e: Event): void {
    e.stopPropagation();
    this.menuOpen.set(false);
    this.delete.emit();
  }
}
