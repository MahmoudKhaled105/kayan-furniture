import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 left-4 z-50 flex flex-col gap-2" dir="rtl">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 min-w-[300px]"
          [ngClass]="{
            'bg-error': toast.type === 'error',
            'bg-primary': toast.type === 'success',
            'bg-gray-700': toast.type === 'info'
          }"
        >
          <span class="material-symbols-outlined">
            {{ toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'info' }}
          </span>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.remove(toast.id)" class="opacity-70 hover:opacity-100 flex items-center justify-center">
            <span class="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  public toastService = inject(ToastService);
}
