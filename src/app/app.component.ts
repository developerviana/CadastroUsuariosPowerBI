import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { PoButtonModule, PoMenuItem, PoMenuModule, PoNotificationService } from '@po-ui/ng-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);

  public readonly menuItems: PoMenuItem[] = [
    {
      label: 'Usuarios Power BI',
      icon: 'po-icon-users',
      shortLabel: 'Usuarios',
      link: '/'
    }
  ];

  public exitRoutine(): void {
    this.notification.information('Saindo da rotina...');
    this.router.navigateByUrl('/');
  }
}
