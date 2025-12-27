export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  title: string;
  subtext: string;
  duration: number;
  type: ToastType;
}
