import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);
  private idCounter = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = this.idCounter++;
    this.toasts.update(t => [...t, { message, type, id }]);
    setTimeout(() => this.remove(id), 5000);
  }

  error(message: string, err?: any) {
    let finalMessage = message;
    if (err && err.error && err.error.message) {
      finalMessage += ': ' + err.error.message;
    } else if (err && err.message) {
      finalMessage += ': ' + err.message;
    }
    this.show(finalMessage, 'error');
  }

  success(message: string) {
    this.show(message, 'success');
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
