import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShipmentService, Shipment } from '../../../shared/services/shipment.service';

@Component({
  selector: 'app-shipments-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shipments-list.html',
  styleUrl: './shipments-list.scss',
})
export class ShipmentsList implements OnInit {
  private shipmentService = inject(ShipmentService);
  
  shipments = signal<Shipment[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  totalDebts = signal('0 ج.م');

  ngOnInit() {
    this.loadShipments();
  }

  loadShipments() {
    this.isLoading.set(true);
    this.shipmentService.getShipments().subscribe({
      next: (data) => {
        this.shipments.set(data);
        this.calculateTotalDebts(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load shipments:', err);
        this.error.set('فشل في تحميل الشحنات');
        this.isLoading.set(false);
      }
    });
  }

  calculateTotalDebts(shipments: Shipment[]) {
    const total = shipments.reduce((sum, s) => sum + (s.declared_value - s.amount_paid), 0);
    this.totalDebts.set(this.formatCurrency(total) + ' ج.م');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG').format(value);
  }

  getSupplierInitial(name?: string): string {
    if (!name) return '?';
    return name.charAt(0);
  }

  getSupplierColor(id: number): string {
    const colors = ['primary', 'secondary', 'tertiary'];
    return colors[id % colors.length];
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'settled': return 'خالصة';
      case 'partial': return 'متقسطة';
      case 'unpaid': return 'لسه مدفعش';
      default: return 'غير معروف';
    }
  }

  getDeliveryStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'in_transit': return 'في الطريق';
      case 'received': return 'تم الاستلام';
      default: return 'قيد الانتظار';
    }
  }
}
