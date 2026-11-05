import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminNavSection } from './admin-nav';
import { AdminNavIconComponent } from './admin-nav-icon.component';

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage, NgTemplateOutlet, AdminNavIconComponent],
  templateUrl: './admin-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-neutral-200/80 bg-neutral-50 transition-[width,translate] duration-200 ease-out lg:relative lg:translate-x-0 lg:shadow-none lg:data-collapsed:w-16',
    '[class.-translate-x-full]': '!mobileOpen()',
    '[class.shadow-xl]': 'mobileOpen()',
    '[attr.data-collapsed]': 'collapsed() || null',
    '(keydown.escape)': 'mobileOpen.set(false)',
  },
})
export class AdminSidebarComponent {
  readonly sections = input.required<AdminNavSection[]>();  readonly collapsed = model(false);
  readonly mobileOpen = model(false);

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
