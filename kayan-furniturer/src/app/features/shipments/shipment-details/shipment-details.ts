import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShipmentService, Shipment } from '../../../shared/services/shipment.service';

@Component({
  selector: 'app-shipment-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shipment-details.html',
  styleUrl: './shipment-details.scss',
})
export class ShipmentDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private shipmentService = inject(ShipmentService);
  
  shipment = signal<Shipment | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadShipment(id);
    }
  }

  loadShipment(id: number) {
    this.isLoading.set(true);
    this.shipmentService.getShipment(id).subscribe({
      next: (data) => {
        this.shipment.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load shipment:', err);
        this.error.set('فشل في تحميل بيانات الشحنة');
        this.isLoading.set(false);
      }
    });
  }

  get paidPercentage(): number {
    const data = this.shipment();
    if (!data || data.declared_value === 0) return 0;
    return Math.round((data.amount_paid / data.declared_value) * 100);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ar-EG').format(value);
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'settled': return 'خالصة';
      case 'partial': return 'متقسطة';
      case 'unpaid': return 'لسه مدفعش';
      default: return 'غير معروف';
    }
  }

  resolveImageUrl(url?: string): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:8787${url}`;
  }

  getLogisticStatus(status?: string): string {
    switch (status) {
      case 'received': return 'تم الاستلام';
      case 'in_transit': return 'في الطريق';
      case 'pending': return 'قيد الانتظار';
      default: return 'غير معروف';
    }
  }

  getDeliveryStatusClass(status?: string): string {
    switch (status) {
      case 'received': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_transit': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pending': return 'bg-outline-variant/10 text-outline-variant border-outline-variant/20';
      default: return 'bg-surface-container-highest text-outline-variant';
    }
  }
}
