import { Routes } from '@angular/router';
import { UserAccessComponent } from '../components/user-access/user-access.component';

export const routes: Routes = [
  {
    path: '',
    component: UserAccessComponent
  },
  {
    path: '**',
    redirectTo: ''
  },
];
