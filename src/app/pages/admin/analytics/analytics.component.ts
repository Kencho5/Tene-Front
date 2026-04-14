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
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '@core/services/admin/admin.service';
import { AnalyticsResponse } from '@core/interfaces/admin/analytics.interface';
import { SharedModule } from '@shared/shared.module';
import { Chart, registerables } from 'chart.js';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';

const PERIOD_OPTIONS: ComboboxItems[] = [
  { value: 'today', label: 'დღეს' },
  { value: 'yesterday', label: 'გუშინ' },
  { value: '7days', label: 'ბოლო 7 დღე' },
  { value: '30days', label: 'ბოლო 30 დღე' },
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

const GRID_COLOR = 'rgba(0, 0, 0, 0.04)';
const TICK_COLOR = '#888888';
const LABEL_COLOR = '#505050';

@Component({
  selector: 'app-analytics',
  imports: [SharedModule, DropdownComponent],
  templateUrl: './analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent implements OnDestroy {
  private readonly adminService = inject(AdminService);

  private viewsByHourCanvas = viewChild<ElementRef<HTMLCanvasElement>>('viewsByHourCanvas');
  private mostViewedCanvas = viewChild<ElementRef<HTMLCanvasElement>>('mostViewedCanvas');
  private conversionCanvas = viewChild<ElementRef<HTMLCanvasElement>>('conversionCanvas');
  private viewsByHourChart: Chart | null = null;
  private mostViewedChart: Chart | null = null;
  private conversionChart: Chart | null = null;

  readonly periodOptions = PERIOD_OPTIONS;
  readonly selectedPeriod = signal<string | undefined>('today');

  readonly periodLabel = computed(() => {
    const labels: Record<string, string> = {
      today: 'დღეს',
      yesterday: 'გუშინ',
      '7days': 'ბოლო 7 დღე',
      '30days': 'ბოლო 30 დღე',
    };
    return labels[this.selectedPeriod() ?? ''] ?? '';
  });

  onPeriodChange(value: string | undefined): void {
    this.selectedPeriod.set(value ?? '30days');
  }

  readonly analyticsResource = rxResource({
    defaultValue: {
      most_viewed: [],
      trending_this_week: [],
      unique_viewers: [],
      views_by_hour: [],
      high_views_low_sales: [],
      conversion_rates: [],
    } as AnalyticsResponse,
    params: () => this.selectedPeriod(),
    stream: ({ params: period }) => this.adminService.getAnalytics(period),
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
    effect(() => {
      const analytics = this.data();
      const vCanvas = this.viewsByHourCanvas();
      const mCanvas = this.mostViewedCanvas();
      const cCanvas = this.conversionCanvas();
      if (!analytics || this.analyticsResource.isLoading()) return;

      if (vCanvas && analytics.views_by_hour.length > 0) {
        this.createViewsByHourChart(vCanvas.nativeElement, analytics);
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
    this.mostViewedChart?.destroy();
    this.conversionChart?.destroy();
  }

  formatHour(hour: number): string {
    const h = Math.floor(hour);
    return `${h.toString().padStart(2, '0')}:00`;
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
            borderColor: '#1aa44a',
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
              gradient.addColorStop(0, 'rgba(26, 164, 74, 0.12)');
              gradient.addColorStop(1, 'rgba(26, 164, 74, 0.01)');
              return gradient;
            },
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#1aa44a',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2.5,
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
    const maxViews = Math.max(...items.map((p) => p.views));

    this.mostViewedChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map((p) => this.truncateLabel(p.product_name, 20)),
        datasets: [
          {
            label: 'ნახვები',
            data: items.map((p) => p.views),
            backgroundColor: items.map((p) => {
              const ratio = p.views / maxViews;
              const alpha = 0.35 + ratio * 0.65;
              return `rgba(26, 164, 74, ${alpha})`;
            }),
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
            backgroundColor: items.map((p) => {
              const pct = Number(p.conversion_pct);
              return pct >= 5 ? 'rgba(26, 164, 74, 0.8)' : pct >= 2 ? 'rgba(245, 166, 35, 0.8)' : 'rgba(255, 30, 7, 0.65)';
            }),
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
