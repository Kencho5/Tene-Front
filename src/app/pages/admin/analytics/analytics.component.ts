import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
  effect,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AdminService } from '@core/services/admin/admin.service';
import { AnalyticsResponse } from '@core/interfaces/admin/analytics.interface';
import { SharedModule } from '@shared/shared.module';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  imports: [SharedModule],
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

  readonly analyticsResource = rxResource({
    defaultValue: {
      most_viewed: [],
      trending_this_week: [],
      unique_viewers: [],
      views_by_hour: [],
      high_views_low_sales: [],
      conversion_rates: [],
    } as AnalyticsResponse,
    stream: () => this.adminService.getAnalytics(),
  });

  readonly data = computed(() => this.analyticsResource.value());

  readonly totalViews = computed(() =>
    this.data().most_viewed.reduce((sum, p) => sum + p.views, 0),
  );

  readonly totalUniqueViewers = computed(() =>
    this.data().unique_viewers.reduce((sum, p) => sum + p.unique_viewers, 0),
  );

  readonly avgConversion = computed(() => {
    const rates = this.data().conversion_rates;
    if (rates.length === 0) return 0;
    const total = rates.reduce((sum, r) => sum + r.conversion_pct, 0);
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
            backgroundColor: 'rgba(26, 164, 74, 0.08)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#1aa44a',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 5,
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
            backgroundColor: '#212121',
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#888888', font: { size: 11 }, maxRotation: 0 },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#888888', font: { size: 11 }, precision: 0 },
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
        labels: items.map((p) => this.truncateLabel(p.product_name, 18)),
        datasets: [
          {
            label: 'ნახვები',
            data: items.map((p) => p.views),
            backgroundColor: '#1aa44a',
            borderRadius: 6,
            barPercentage: 0.6,
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
            backgroundColor: '#212121',
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => data.most_viewed[items[0].dataIndex]?.product_name ?? '',
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#888888', font: { size: 11 }, precision: 0 },
            border: { display: false },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: '#505050', font: { size: 11 } },
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
        labels: items.map((p) => this.truncateLabel(p.product_name, 18)),
        datasets: [
          {
            label: 'კონვერსია %',
            data: items.map((p) => p.conversion_pct),
            backgroundColor: items.map((p) =>
              p.conversion_pct >= 5 ? '#1aa44a' : p.conversion_pct >= 2 ? '#f5a623' : '#ff1e07',
            ),
            borderRadius: 6,
            barPercentage: 0.6,
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
            backgroundColor: '#212121',
            titleFont: { size: 12 },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => data.conversion_rates[items[0].dataIndex]?.product_name ?? '',
              label: (item) => `${Number(item.raw).toFixed(2)}%`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              color: '#888888',
              font: { size: 11 },
              callback: (value) => `${value}%`,
            },
            border: { display: false },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: '#505050', font: { size: 11 } },
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
