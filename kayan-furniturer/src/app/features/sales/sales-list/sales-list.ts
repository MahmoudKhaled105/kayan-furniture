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
  searchQuery = signal<string>('');
  
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

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  getFilteredOrders(): Order[] {
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();
    
    return this.orders().filter(o => {
      const matchesFilter = filter === 'all' || o.status === filter;
      const matchesSearch = query === '' || 
        (o.customer_name?.toLowerCase().includes(query) || o.customer_phone?.includes(query));
      return matchesFilter && matchesSearch;
    });
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
