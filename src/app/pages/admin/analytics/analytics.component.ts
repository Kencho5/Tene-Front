import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
  effect,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';import { AdminService } from '@core/services/admin/admin.service';
import { AnalyticsResponse } from '@core/interfaces/admin/analytics.interface';
import { SharedModule } from '@shared/shared.module';
import { Chart, registerables } from 'chart.js';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';

const DATE_PRESETS: ComboboxItems[] = [
  { label: 'დღეს', value: 'today' },
  { label: 'გუშინ', value: 'yesterday' },
  { label: 'გუშინწინ', value: 'day_before' },
  { label: '3 დღის წინ', value: 'three_days_ago' },
  { label: '7 დღის', value: 'last_7' },
  { label: '10 დღის', value: 'last_10' },
  { label: '30 დღის', value: 'last_30' },
  { label: 'ამ თვის', value: 'this_month' },
  { label: 'წინა თვის', value: 'last_month' },
];

Chart.register(...registerables);

const TOOLTIP_CONFIG = {
  backgroundColor: '#212121',
  titleFont: { size: 12, weight: 'bold' as const },
  bodyFont: { size: 12 },
  padding: { top: 8, bottom: 8, left: 12, right: 12 },
  cornerRadius: 8,
  displayColors: false,
  boxPadding: 4,
};

const GRID_COLOR = 'rgba(33, 33, 33, 0.06)';
const TICK_COLOR = '#8a8a8a';
const LABEL_COLOR = '#505050';
const BAR_COLOR = '#20c45f';
const BAR_HOVER_COLOR = '#0fa44d';

@Component({
  selector: 'app-analytics',
  imports: [SharedModule, DropdownComponent],
  templateUrl: './analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent implements OnDestroy {
  private readonly adminService = inject(AdminService);

  private viewsByHourCanvas = viewChild<ElementRef<HTMLCanvasElement>>('viewsByHourCanvas');
  private viewsByDayCanvas = viewChild<ElementRef<HTMLCanvasElement>>('viewsByDayCanvas');
  private mostViewedCanvas = viewChild<ElementRef<HTMLCanvasElement>>('mostViewedCanvas');
  private conversionCanvas = viewChild<ElementRef<HTMLCanvasElement>>('conversionCanvas');
  private viewsByHourChart: Chart | null = null;
  private viewsByDayChart: Chart | null = null;
  private mostViewedChart: Chart | null = null;
  private conversionChart: Chart | null = null;

  readonly datePresets = DATE_PRESETS;
  readonly selectedPreset = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');

  readonly periodLabel = computed(() => {
    const preset = DATE_PRESETS.find((p) => p.value === this.selectedPreset());
    if (preset) return preset.label;
    const from = this.fromDate();
    const to = this.toDate();
    if (!from && !to) return 'სრული პერიოდი';
    return `${from || '...'} - ${to || '...'}`;
  });

  readonly analyticsResource = rxResource({
    defaultValue: {
      most_viewed: [],
      trending_this_week: [],
      unique_viewers: [],
      views_by_hour: [],
      views_by_day: [],
      high_views_low_sales: [],
      conversion_rates: [],
    } as AnalyticsResponse,
    params: () => ({
      from_date: this.fromDate() ? this.startOfLocalDay(this.fromDate()) : undefined,
      to_date: this.toDate() ? this.endOfLocalDay(this.toDate()) : undefined,
    }),
    stream: ({ params }) => this.adminService.getAnalytics(params),
  });

  readonly viewsByDay = computed(() => {
    const rows = this.data().views_by_day;
    const counts = new Map(rows.map((r) => [r.day.slice(0, 10), r.views]));
    const start = this.fromDate() || rows[0]?.day.slice(0, 10);
    const end = this.toDate() || rows[rows.length - 1]?.day.slice(0, 10);
    if (!start || !end) return [];
    const days: { day: string; views: number }[] = [];
    const cursor = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (cursor <= last) {
      const key = this.localDateInput(cursor);
      days.push({ day: key, views: counts.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  });

  readonly data = computed(() => this.analyticsResource.value());

  readonly totalViews = computed(() =>
    this.data().views_by_hour.reduce((sum, h) => sum + h.views, 0),
  );

  readonly totalLoggedInViewers = computed(() =>
    this.data().unique_viewers.reduce((sum, p) => sum + p.logged_in_viewers, 0),
  );

  readonly avgConversion = computed(() => {
    const rates = this.data().conversion_rates;
    if (rates.length === 0) return 0;
    const total = rates.reduce((sum, r) => sum + Number(r.conversion_pct), 0);
    return total / rates.length;
  });

  readonly peakHour = computed(() => {
    const hours = this.data().views_by_hour;
    if (hours.length === 0) return null;
    return hours.reduce((max, h) => (h.views > max.views ? h : max), hours[0]);
  });

  constructor() {
    this.selectPreset('last_30');

    effect(() => {
      const analytics = this.data();
      const days = this.viewsByDay();
      const vCanvas = this.viewsByHourCanvas();
      const dCanvas = this.viewsByDayCanvas();
      const mCanvas = this.mostViewedCanvas();
      const cCanvas = this.conversionCanvas();
      if (!analytics || this.analyticsResource.isLoading()) return;

      if (vCanvas && analytics.views_by_hour.length > 0) {
        this.createViewsByHourChart(vCanvas.nativeElement, analytics);
      }
      if (dCanvas && days.length > 0) {
        this.createViewsByDayChart(dCanvas.nativeElement, days);
      }
      if (mCanvas && analytics.most_viewed.length > 0) {
        this.createMostViewedChart(mCanvas.nativeElement, analytics);
      }
      if (cCanvas && analytics.conversion_rates.length > 0) {
        this.createConversionChart(cCanvas.nativeElement, analytics);
      }
    });
  }

  ngOnDestroy(): void {
    this.viewsByHourChart?.destroy();
    this.viewsByDayChart?.destroy();
    this.mostViewedChart?.destroy();
    this.conversionChart?.destroy();
  }

  formatHour(hour: number): string {
    const h = Math.floor(hour);
    return `${h.toString().padStart(2, '0')}:00`;
  }

  selectPreset(value: string | undefined): void {
    if (!value) return;

    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (value) {
      case 'today':
        break;
      case 'yesterday':
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        break;
      case 'day_before':
        from.setDate(today.getDate() - 2);
        to.setDate(today.getDate() - 2);
        break;
      case 'three_days_ago':
        from.setDate(today.getDate() - 3);
        to.setDate(today.getDate() - 3);
        break;
      case 'last_7':
        from.setDate(today.getDate() - 7);
        break;
      case 'last_10':
        from.setDate(today.getDate() - 10);
        break;
      case 'last_30':
        from.setDate(today.getDate() - 30);
        break;
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    this.selectedPreset.set(value);
    this.fromDate.set(this.localDateInput(from));
    this.toDate.set(this.localDateInput(to));
  }

  onFromDateChange(event: Event): void {
    this.selectedPreset.set('');
    this.fromDate.set((event.target as HTMLInputElement).value);
  }

  onToDateChange(event: Event): void {
    this.selectedPreset.set('');
    this.toDate.set((event.target as HTMLInputElement).value);
  }

  clearDates(): void {
    this.selectedPreset.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }

  private localDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfLocalDay(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private endOfLocalDay(value: string): string {
    return new Date(`${value}T23:59:59.999`).toISOString();
  }

  private formatDay(value: string): string {
    return new Date(`${value}T00:00:00`).toLocaleDateString('ka-GE', {
      month: 'short',
      day: 'numeric',
    });
  }

  private createViewsByDayChart(
    canvas: HTMLCanvasElement,
    days: { day: string; views: number }[],
  ): void {
    this.viewsByDayChart?.destroy();

    this.viewsByDayChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: days.map((d) => this.formatDay(d.day)),
        datasets: [
          {
            label: 'ნახვები',
            data: days.map((d) => d.views),
            backgroundColor: BAR_COLOR,
            hoverBackgroundColor: BAR_HOVER_COLOR,
            borderRadius: 4,
            maxBarThickness: 32,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CONFIG,
            callbacks: {
              label: (item) => `${item.raw} ნახვა`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
            border: { display: false },
          },
          y: {
            grid: { color: GRID_COLOR, drawTicks: false },
            ticks: { color: TICK_COLOR, font: { size: 11 }, precision: 0, padding: 8 },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private createViewsByHourChart(canvas: HTMLCanvasElement, data: AnalyticsResponse): void {
    this.viewsByHourChart?.destroy();

    const sorted = [...data.views_by_hour].sort((a, b) => a.hour - b.hour);

    this.viewsByHourChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sorted.map((h) => this.formatHour(h.hour)),
        datasets: [
          {
            label: 'ნახვები',
            data: sorted.map((h) => h.views),
            borderColor: BAR_COLOR,
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
              gradient.addColorStop(0, 'rgba(32, 196, 95, 0.14)');
              gradient.addColorStop(1, 'rgba(32, 196, 95, 0)');
              return gradient;
            },
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: BAR_COLOR,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CONFIG,
            callbacks: {
              label: (item) => `${item.raw} ნახვა`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: TICK_COLOR, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
            border: { display: false },
          },
          y: {
            grid: { color: GRID_COLOR, drawTicks: false },
            ticks: { color: TICK_COLOR, font: { size: 11 }, precision: 0, padding: 8 },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });
  }

  private createMostViewedChart(canvas: HTMLCanvasElement, data: AnalyticsResponse): void {
    this.mostViewedChart?.destroy();

    const items = data.most_viewed.slice(0, 8);

    this.mostViewedChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((p) => this.truncateLabel(p.product_name, 20)),
        datasets: [
          {
            label: 'ნახვები',
            data: items.map((p) => p.views),
            backgroundColor: BAR_COLOR,
            hoverBackgroundColor: BAR_HOVER_COLOR,
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CONFIG,
            callbacks: {
              title: (items) => data.most_viewed[items[0].dataIndex]?.product_name ?? '',
              label: (item) => `${item.raw} ნახვა`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID_COLOR, drawTicks: false },
            ticks: { color: TICK_COLOR, font: { size: 11 }, precision: 0, padding: 8 },
            border: { display: false },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: LABEL_COLOR, font: { size: 11 }, padding: 4 },
            border: { display: false },
          },
        },
      },
    });
  }

  private createConversionChart(canvas: HTMLCanvasElement, data: AnalyticsResponse): void {
    this.conversionChart?.destroy();

    const items = data.conversion_rates.slice(0, 8);

    this.conversionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((p) => this.truncateLabel(p.product_name, 20)),
        datasets: [
          {
            label: 'კონვერსია %',
            data: items.map((p) => Number(p.conversion_pct)),
            backgroundColor: BAR_COLOR,
            hoverBackgroundColor: BAR_HOVER_COLOR,
            borderRadius: 4,
            barPercentage: 0.65,
            categoryPercentage: 0.85,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_CONFIG,
            callbacks: {
              title: (items) => data.conversion_rates[items[0].dataIndex]?.product_name ?? '',
              label: (item) => `კონვერსია: ${Number(item.raw).toFixed(2)}%`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID_COLOR, drawTicks: false },
            ticks: {
              color: TICK_COLOR,
              font: { size: 11 },
              callback: (value) => `${value}%`,
              padding: 8,
            },
            border: { display: false },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: LABEL_COLOR, font: { size: 11 }, padding: 4 },
            border: { display: false },
          },
        },
      },
    });
  }

  private truncateLabel(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  }
}
