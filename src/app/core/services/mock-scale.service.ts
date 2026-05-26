import { Injectable, signal } from '@angular/core';
import { ScaleReading } from '../models/scale.model';

@Injectable({ providedIn: 'root' })
export class MockScaleService {
  readonly currentReading = signal<ScaleReading | null>(null);

  private intervalId: number | null = null;

  startPolling(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      const weight = Math.round((Math.random() * 24.5 + 0.5) * 100) / 100;
      this.currentReading.set({
        weight,
        unit: 'kg',
        stable: true,
        timestamp: new Date().toISOString(),
      });
    }, 800);
  }

  stopPolling(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentReading.set(null);
  }
}
