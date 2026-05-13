import { Routes } from '@angular/router';
import { SuppliersList } from './features/suppliers/suppliers-list/suppliers-list';
import { SupplierDetails } from './features/suppliers/supplier-details/supplier-details';
import { AddSupplier } from './features/suppliers/add-supplier/add-supplier';
import { ShipmentsList } from './features/shipments/shipments-list/shipments-list';
import { ShipmentDetails } from './features/shipments/shipment-details/shipment-details';
import { AddShipment } from './features/shipments/add-shipment/add-shipment';
import { InventoryList } from './features/inventory/inventory-list/inventory-list';
import { InventoryDetails } from './features/inventory/inventory-details/inventory-details';
import { AddProduct } from './features/inventory/add-product/add-product';
import { CustomersList } from './features/customers/customers-list/customers-list';
import { CustomerDetails } from './features/customers/customer-details/customer-details';
import { SalesList } from './features/sales/sales-list/sales-list';
import { OrderDetails } from './features/sales/order-details/order-details';
import { AddOrder } from './features/sales/add-order/add-order';
import { AccountsDashboard } from './features/accounts/accounts-dashboard/accounts-dashboard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './shared/components/login/login.component';
import { RegisterComponent } from './shared/components/register/register.component';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'suppliers', component: SuppliersList, canActivate: [AuthGuard] },
  { path: 'suppliers/add', component: AddSupplier, canActivate: [AuthGuard] },
  { path: 'suppliers/:id', component: SupplierDetails, canActivate: [AuthGuard] },
  { path: 'shipments', component: ShipmentsList, canActivate: [AuthGuard] },
  { path: 'shipments/add', component: AddShipment, canActivate: [AuthGuard] },
  { path: 'shipments/edit/:id', component: AddShipment, canActivate: [AuthGuard] },
  { path: 'shipments/:id', component: ShipmentDetails, canActivate: [AuthGuard] },
  { path: 'inventory', component: InventoryList, canActivate: [AuthGuard] },
  { path: 'inventory/add', component: AddProduct, canActivate: [AuthGuard] },
  { path: 'inventory/edit/:id', component: AddProduct, canActivate: [AuthGuard] },
  { path: 'inventory/:id', component: InventoryDetails, canActivate: [AuthGuard] },
  { path: 'customers', component: CustomersList, canActivate: [AuthGuard] },
  { path: 'customers/:id', component: CustomerDetails, canActivate: [AuthGuard] },
  { path: 'sales', component: SalesList, canActivate: [AuthGuard] },
  { path: 'sales/add', component: AddOrder, canActivate: [AuthGuard] },
  { path: 'sales/:id', component: OrderDetails, canActivate: [AuthGuard] },
  { path: 'accounts', component: AccountsDashboard, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
