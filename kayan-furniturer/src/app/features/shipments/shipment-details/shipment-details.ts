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

  getLogisticStatus(status?: string): string {
    switch (status) {
      case 'ARRIVED': return 'وصلت بالسلامة';
      case 'IN_TRANSIT': return 'في الطريق (البحر)';
      case 'PENDING': return 'قيد التجهيز';
      default: return 'غير معروف';
    }
  }
}
