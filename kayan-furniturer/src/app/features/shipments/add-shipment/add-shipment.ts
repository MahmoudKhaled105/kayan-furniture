import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ShipmentService, Shipment } from '../../../shared/services/shipment.service';
import { SupplierService, Supplier } from '../../../shared/services/supplier.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-add-shipment',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './add-shipment.html',
  styleUrl: './add-shipment.scss',
})
export class AddShipment implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private shipmentService = inject(ShipmentService);
  private supplierService = inject(SupplierService);
  private toast = inject(ToastService);

  currentStep = signal(1);
  isLoading = signal(false);
  isEditMode = signal(false);
  editId = signal<number | null>(null);
  suppliers = signal<Supplier[]>([]);
  
  shipmentForm: FormGroup;

  constructor() {
    this.shipmentForm = this.fb.group({
      container_number: ['', Validators.required],
      date_received: [new Date().toISOString().split('T')[0], Validators.required],
      estimated_arrival: [''],
      notes: [''],
      supplier_id: [null, Validators.required],
      declared_value: [0, [Validators.required, Validators.min(1)]],
      partial_delivery: [false]
    });
  }

  ngOnInit() {
    this.loadSuppliers();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId.set(Number(id));
      this.loadShipmentData(Number(id));
    }
  }

  loadShipmentData(id: number) {
    this.isLoading.set(true);
    this.shipmentService.getShipment(id).subscribe({
      next: (data: Shipment) => {
        this.shipmentForm.patchValue({
          container_number: data.container_number,
          date_received: data.date_received,
          estimated_arrival: data.estimated_arrival,
          notes: data.notes,
          supplier_id: data.supplier_id,
          declared_value: data.declared_value,
          partial_delivery: data.partial_delivery === 1
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/shipments']);
      }
    });
  }

  loadSuppliers() {
    this.supplierService.getSuppliers().subscribe({
      next: (data) => this.suppliers.set(data),
      error: (err) => console.error('Failed to load suppliers:', err)
    });
  }

  nextStep() {
    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  setStep(step: number) {
    this.currentStep.set(step);
  }

  onSubmit() {
    if (this.shipmentForm.valid) {
      this.isLoading.set(true);
      const val = this.shipmentForm.value;
      
      let payload: any;
      if (this.isEditMode()) {
        payload = {
          date_received: val.date_received,
          declared_value: val.declared_value,
          partial_delivery: val.partial_delivery ? 1 : 0,
          notes: val.notes,
          container_number: val.container_number,
          estimated_arrival: val.estimated_arrival
        };
      } else {
        payload = {
          ...val,
          partial_delivery: val.partial_delivery ? 1 : 0,
          status: 'PENDING'
        };
      }

      const obs = this.isEditMode() 
        ? this.shipmentService.updateShipment(this.editId()!, payload)
        : this.shipmentService.createShipment(payload);

      obs.subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/shipments']);
        },
        error: (err) => {
          console.error('Failed to save shipment:', err);
          this.isLoading.set(false);
          this.toast.error('فشل في حفظ الشحنة');
        }
      });
    } else {
      // Mark all as touched to show errors
      this.shipmentForm.markAllAsTouched();
    }
  }

  get selectedSupplier(): Supplier | undefined {
    const id = this.shipmentForm.get('supplier_id')?.value;
    return this.suppliers().find(s => s.id === Number(id));
  }
}
