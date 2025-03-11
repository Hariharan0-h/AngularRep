import { Routes } from '@angular/router';
import { ReportsComponent } from './Components/reports/reports.component';
import { DashboardComponent } from './Components/dashboard/dashboard.component';
//import { FilesComponent } from './Components/files/files.component';

export const routes: Routes = [
  { path: 'reports', component: ReportsComponent },
  { path: 'dashboard', component: DashboardComponent },
  //{ path: 'files', component: FilesComponent },
  { path: 'home', component: DashboardComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' } // Default route
];
