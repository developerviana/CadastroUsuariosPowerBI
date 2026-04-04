import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { PoMenuItem, PoMenuModule, PoNotificationService } from '@po-ui/ng-components';
import { ProAppConfigService, ProThreadInfoService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly proAppConfigService = inject(ProAppConfigService);
  private readonly proThreadInfoService = inject(ProThreadInfoService);

  public menuItems: PoMenuItem[] = [
    {
      label: 'Usuarios Power BI',
      icon: 'po-icon-users',
      shortLabel: 'Usuarios',
      link: '/'
    },
    {
      label: 'Sair da rotina',
      icon: 'po-icon-exit',
      shortLabel: 'Sair',
      action: () => this.exitRoutine()
    }
  ];

  public ngOnInit(): void {
    this.getUserThreadInfo();
  }

  public getUserThreadInfo(): void {
    this.proThreadInfoService.getUserInfoThread().subscribe({
      next: userInfo => {
        const userLabel = userInfo?.displayName || userInfo?.userName || userInfo?.complete_name || 'Usuario';
        const nextItems = [...this.menuItems];

        nextItems[0] = {
          ...nextItems[0],
          label: userLabel,
          shortLabel: userLabel
        };

        this.menuItems = nextItems;
      }
    });
  }

  public exitRoutine(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
      return;
    }

    this.notification.information('Aplicacao em desenvolvimento local.');
    this.router.navigateByUrl('/');
  }
}
