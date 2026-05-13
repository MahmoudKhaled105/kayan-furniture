import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService, Order } from '../../../shared/services/order.service';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sales-list.html',
  styleUrl: './sales-list.scss',
})
export class SalesList implements OnInit {
  private orderService = inject(OrderService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  orders = signal<Order[]>([]);
  
  activeFilter = signal<'all' | 'active' | 'backorder' | 'fulfilled'>('all');

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading.set(true);
    this.error.set(null);
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load orders:', err);
        this.error.set('فشل في تحميل سجل المبيعات');
        this.isLoading.set(false);
      }
    });
  }

  setFilter(filter: 'all' | 'active' | 'backorder' | 'fulfilled') {
    this.activeFilter.set(filter);
  }

  getFilteredOrders(): Order[] {
    const filter = this.activeFilter();
    if (filter === 'all') return this.orders();
    return this.orders().filter(o => o.status === filter);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary border-primary/20';
      case 'fulfilled': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'backorder': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
      default: return 'bg-outline-variant/10 text-outline-variant border-outline-variant/20';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'قيد التنفيذ';
      case 'fulfilled': return 'تم التسليم';
      case 'backorder': return 'حجز (نواقص)';
      default: return status;
    }
  }
}
