import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { InventoryService, ProductItem, InventoryItem } from '../../../shared/services/inventory.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inventory-list.html',
  styleUrl: './inventory-list.scss',
})
export class InventoryList implements OnInit {
  private inventoryService = inject(InventoryService);

  isLoading = signal(true);
  error = signal<string | null>(null);

  locations = signal<any[]>([]);
  selectedLocation = signal<number | null>(null);
  
  activeTab = signal<'products' | 'bulk'>('products');
  
  products = signal<ProductItem[]>([]);
  bulkItems = signal<InventoryItem[]>([]);
  
  stockValueSummary = signal<any>(null);

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading.set(true);
    this.inventoryService.getLocations().subscribe({
      next: (locs: any[]) => {
        this.locations.set(locs);
        this.loadData();
      },
      error: (err: any) => {
        console.error('Failed to load locations:', err);
        this.error.set('فشل في تحميل الفروع');
        this.isLoading.set(false);
      }
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.error.set(null);
    
    const params: any = {};
    if (this.selectedLocation()) {
      params.location_id = this.selectedLocation();
    }

    // Fetch both to keep counts accurate, even if only one is displayed
    this.inventoryService.getItems(params).subscribe({
      next: (products: ProductItem[]) => {
        this.products.set(products);
        this.inventoryService.getInventory(params).subscribe({
          next: (bulk: InventoryItem[]) => {
            this.bulkItems.set(bulk);
            this.loadStockSummary();
            this.isLoading.set(false);
          },
          error: (err: any) => {
            console.error('Failed to load bulk data:', err);
            this.error.set('فشل في تحميل بيانات الخامات');
            this.isLoading.set(false);
          }
        });
      },
      error: (err: any) => {
        console.error('Failed to load products:', err);
        this.error.set('فشل في تحميل بيانات المنتجات');
        this.isLoading.set(false);
      }
    });
  }

  loadStockSummary() {
    this.inventoryService.getStockValue(this.selectedLocation() || undefined).subscribe({
      next: (data) => this.stockValueSummary.set(data),
      error: (err) => console.error('Failed to load stock summary:', err)
    });
  }

  setTab(tab: 'products' | 'bulk') {
    this.activeTab.set(tab);
    this.loadData();
  }

  setLocation(locationId: number | null) {
    this.selectedLocation.set(locationId);
    this.loadData();
  }

  onDeleteBulkItem(id: number) {
    if (confirm('هل أنت متأكد من حذف هذا البند من المخزون؟')) {
      this.isLoading.set(true);
      this.inventoryService.deleteInventoryItem(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err: any) => {
          console.error('Failed to delete item:', err);
          this.error.set('فشل في حذف البند');
          this.isLoading.set(false);
        }
      });
    }
  }

  onDeleteProduct(event: Event, id: number) {
    event.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه القطعة من المخزون نهائياً؟')) {
      this.isLoading.set(true);
      this.inventoryService.deleteItem(id).subscribe({
        next: () => {
          this.loadData();
        },
        error: (err: any) => {
          console.error('Failed to delete product:', err);
          this.error.set('فشل في حذف القطعة');
          this.isLoading.set(false);
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'in_storage': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
      case 'sold': return 'bg-primary/10 text-primary border-primary/20';
      case 'reserved': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'in_transit': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      default: return 'bg-outline-variant/10 text-outline-variant border-outline-variant/20';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'in_storage': return 'متاح بالمخزن';
      case 'sold': return 'تم البيع';
      case 'reserved': return 'محجوز';
      case 'in_transit': return 'في الطريق';
      default: return status;
    }
  }
}
