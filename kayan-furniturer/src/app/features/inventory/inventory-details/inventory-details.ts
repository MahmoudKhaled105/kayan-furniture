import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InventoryService, ProductItem } from '../../../shared/services/inventory.service';

@Component({
  selector: 'app-inventory-details',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './inventory-details.html',
  styleUrl: './inventory-details.scss',
})
export class InventoryDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);

  isLoading = signal(true);
  item = signal<ProductItem | null>(null);
  locations = signal<any[]>([]);
  transfers = signal<any[]>([]);
  
  selectedImageIndex = signal(0);
  
  transferForm: FormGroup;
  showTransferModal = signal(false);

  constructor() {
    this.transferForm = this.fb.group({
      to_location_id: [null, Validators.required],
      transfer_date: [new Date().toISOString().split('T')[0], Validators.required],
      transport_cost: [0],
      notes: ['']
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadData(parseInt(id));
    }
  }

  loadData(id: number) {
    this.isLoading.set(true);
    this.inventoryService.getItem(id).subscribe({
      next: (data: any) => {
        this.item.set(data);
        this.selectedImageIndex.set(0); // Reset to first image
        this.loadTransfers(id);
        this.isLoading.set(false);
      },
      error: () => {
        this.router.navigate(['/inventory']);
      }
    });

    this.inventoryService.getLocations().subscribe((l: any[]) => this.locations.set(l));
  }

  setMainImage(index: number) {
    this.selectedImageIndex.set(index);
  }

  loadTransfers(id: number) {
    this.inventoryService.getItemTransfers(id).subscribe((t: any[]) => this.transfers.set(t));
  }

  onTransfer() {
    if (this.transferForm.valid && this.item()) {
      this.isLoading.set(true);
      this.inventoryService.transferItem(this.item()!.id, this.transferForm.value).subscribe({
        next: () => {
          this.showTransferModal.set(false);
          this.loadData(this.item()!.id);
        },
        error: (err: any) => {
          console.error('Transfer failed:', err);
          this.isLoading.set(false);
          alert('فشل في نقل القطعة');
        }
      });
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
