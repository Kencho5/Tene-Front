import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { User } from '@core/interfaces/auth.interface';
import { AdminNavItem, AdminNavSection } from './admin-nav';
import { AdminNavIconComponent } from './admin-nav-icon.component';

interface SearchResult extends AdminNavItem {
  section: string;
}

@Component({
  selector: 'app-admin-header',
  imports: [RouterLink, AdminNavIconComponent],
  templateUrl: './admin-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block shrink-0',
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AdminHeaderComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly sections = input.required<AdminNavSection[]>();
  readonly user = input<User | null>(null);
  readonly menuToggle = output<void>();
  readonly logout = output<void>();

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  private readonly accountMenu = viewChild.required<ElementRef<HTMLElement>>('accountMenu');

  protected readonly query = signal('');
  protected readonly searchFocused = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly accountOpen = signal(false);

  protected readonly initial = computed(() => this.user()?.name?.charAt(0).toUpperCase() ?? '');

  protected readonly results = computed<SearchResult[]>(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) {
      return [];
    }
    return this.sections()
      .flatMap((section) => section.items.map((item) => ({ ...item, section: section.title ?? '' })))
      .filter((item) => item.label.toLowerCase().includes(term));
  });

  protected readonly showResults = computed(() => this.searchFocused() && this.query().trim().length > 0);

  protected readonly activeOptionId = computed(() =>
    this.showResults() && this.results().length ? `admin-search-option-${this.activeIndex()}` : null,
  );

  protected onQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.activeIndex.update((i) => (i + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.activeIndex.update((i) => (i - 1 + count) % count);
        break;
      case 'Enter': {
        const result = this.results()[this.activeIndex()];
        if (result) this.select(result);
        break;
      }
      case 'Escape':
        this.query.set('');
        this.searchInput().nativeElement.blur();
        break;
    }
  }

  protected select(result: SearchResult): void {
    this.router.navigateByUrl(result.route);
    this.query.set('');
    this.searchInput().nativeElement.blur();
  }

  protected toggleAccount(): void {
    this.accountOpen.update((open) => !open);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected onLogout(): void {
    this.accountOpen.set(false);
    this.logout.emit();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const el = this.searchInput().nativeElement;
      el.focus();
      el.select();
    } else if (event.key === 'Escape') {
      this.accountOpen.set(false);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.accountOpen() && !this.accountMenu().nativeElement.contains(event.target as Node)) {
      this.accountOpen.set(false);
    }
  }
}
