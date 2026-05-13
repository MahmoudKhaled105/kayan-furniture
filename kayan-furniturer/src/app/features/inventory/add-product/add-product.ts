import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { InventoryService, InventoryItem, ProductItem } from '../../../shared/services/inventory.service';
import { ShipmentService, Shipment } from '../../../shared/services/shipment.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss',
})
export class AddProduct implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private shipmentService = inject(ShipmentService);

  isLoading = signal(false);
  itemType = signal<'product' | 'bulk'>('product');
  isEditMode = signal(false);
  editId = signal<number | null>(null);
  
  locations = signal<any[]>([]);
  shipments = signal<Shipment[]>([]);
  
  itemForm: FormGroup;

  constructor() {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      category: [''],
      location_id: [null, Validators.required],
      // Product specific
      shipment_id: [null],
      purchase_value: [0],
      sale_price: [0],
      description: [''],
      images: this.fb.array([]),
      // Bulk specific
      quantity: [0],
      unit_price: [0]
    });
  }

  get imageControls() {
    return (this.itemForm.get('images') as FormArray).controls;
  }

  addImage(url: string = '') {
    const images = this.itemForm.get('images') as FormArray;
    images.push(this.fb.control(url));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  onFileSelected(event: any) {
    const files = event.target.files as FileList;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      try {
        const compressedBase64 = await this.compressImage(file);
        this.addImage(compressedBase64);
      } catch (err) {
        console.error('Compression failed:', err);
        // Fallback to original reader if compression fails unexpectedly
        const reader = new FileReader();
        reader.onload = (e: any) => this.addImage(e.target.result);
        reader.readAsDataURL(file);
      }
    });

    event.target.value = '';
  }

  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 to significantly reduce size while keeping quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number) {
    const images = this.itemForm.get('images') as FormArray;
    images.removeAt(index);
  }

  ngOnInit() {
    this.loadData();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId.set(parseInt(id));
      this.loadItemData(parseInt(id));
    }
    this.updateValidators();
  }

  loadData() {
    this.inventoryService.getLocations().subscribe((l: any[]) => this.locations.set(l));
    this.shipmentService.getShipments().subscribe((s: any[]) => this.shipments.set(s));
  }

  loadItemData(id: number) {
    this.isLoading.set(true);
    // Since this route can be accessed for both product and bulk edit, we might need logic to distinguish.
    // However, the user provided backend specifically for bulk inventory.
    // If it's a bulk item, use getInventoryItem.
    this.inventoryService.getInventoryItem(id).subscribe({
      next: (item: InventoryItem) => {
        this.itemType.set('bulk');
        this.itemForm.patchValue({
          name: item.name,
          category: item.category,
          location_id: item.location_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        });
        this.updateValidators();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load item:', err);
        // Fallback for ProductItem if needed (if shared route)
        this.inventoryService.getItem(id).subscribe({
          next: (item: ProductItem) => {
            this.itemType.set('product');
            this.itemForm.patchValue({
              name: item.name,
              category: item.category,
              location_id: item.location_id,
              shipment_id: item.shipment_id,
              purchase_value: item.purchase_value,
              sale_price: item.sale_price,
              description: item.description
            });
            
            // Populate images
            const imageArray = this.itemForm.get('images') as FormArray;
            imageArray.clear();
            if (item.images && Array.isArray(item.images)) {
              item.images.forEach(url => this.addImage(url));
            }

            this.updateValidators();
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
            this.router.navigate(['/inventory']);
          }
        });
      }
    });
  }

  setType(type: 'product' | 'bulk') {
    this.itemType.set(type);
    this.updateValidators();
  }

  updateValidators() {
    const pVal = this.itemForm.get('purchase_value');
    const sPrice = this.itemForm.get('sale_price');
    const qty = this.itemForm.get('quantity');
    const uPrice = this.itemForm.get('unit_price');

    if (this.itemType() === 'product') {
      pVal?.setValidators([Validators.required, Validators.min(0)]);
      sPrice?.setValidators([Validators.required, Validators.min(0)]);
      qty?.clearValidators();
      uPrice?.clearValidators();
    } else {
      qty?.setValidators([Validators.required, Validators.min(1)]);
      uPrice?.setValidators([Validators.required, Validators.min(0)]);
      pVal?.clearValidators();
      sPrice?.clearValidators();
    }

    pVal?.updateValueAndValidity();
    sPrice?.updateValueAndValidity();
    qty?.updateValueAndValidity();
    uPrice?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.itemForm.valid) {
      this.isLoading.set(true);
      const formValue = this.itemForm.value;
      
      let payload: any;
      let obs: Observable<any>;
      
      if (this.itemType() === 'bulk') {
        payload = {
          name: formValue.name,
          category: formValue.category,
          location_id: formValue.location_id ? parseInt(formValue.location_id) : null,
          quantity: parseFloat(formValue.quantity) || 0,
          unit_price: parseFloat(formValue.unit_price) || 0
        };
      } else {
        payload = {
          name: formValue.name,
          category: formValue.category,
          location_id: formValue.location_id ? parseInt(formValue.location_id) : null,
          shipment_id: formValue.shipment_id ? parseInt(formValue.shipment_id) : null,
          purchase_value: parseFloat(formValue.purchase_value) || 0,
          sale_price: parseFloat(formValue.sale_price) || 0,
          description: formValue.description,
          images: formValue.images?.filter((url: string) => !!url.trim()) || []
        };
      }

      if (this.isEditMode()) {
        obs = this.itemType() === 'product'
          ? this.inventoryService.updateItem(this.editId()!, payload)
          : this.inventoryService.updateInventoryItem(this.editId()!, payload);
      } else {
        obs = this.itemType() === 'product'
          ? this.inventoryService.createItem(payload)
          : this.inventoryService.createInventoryItem(payload);
      }

      obs.subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/inventory']);
        },
        error: (err: any) => {
          console.error('Failed to save item:', err);
          this.isLoading.set(false);
          alert('فشل في حفظ البيانات');
        }
      });
    } else {
      this.itemForm.markAllAsTouched();
    }
  }
}
