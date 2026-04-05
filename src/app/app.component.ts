import { AfterViewInit, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { PoMenuItem, PoMenuModule, PoNotificationService } from '@po-ui/ng-components';
import { ProAppConfigService, ProSessionInfoService, ProThreadInfoService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly proAppConfigService = inject(ProAppConfigService);
  private readonly proThreadInfoService = inject(ProThreadInfoService);
  private readonly proSessionInfoService = inject(ProSessionInfoService);

  public sessionContext = {
    company: '-',
    branch: '-',
    module: '-'
  };

  public userContext = {
    id: '-',
    login: '-',
    name: '-'
  };

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
      action: () => this.exitRoutine(true)
    }
  ];

  public ngAfterViewInit(): void {
    setTimeout(() => {
      this.getUserThreadInfo();
      this.loadSessionContext();
    });
  }

  public loadSessionContext(): void {
    if (!this.proAppConfigService.insideProtheus()) {
      return;
    }

    try {
      const company = this.proSessionInfoService.getCompany();
      const branch = this.proSessionInfoService.getBranch();
      const module = this.proSessionInfoService.getSystemModule();

      this.sessionContext = {
        company: company?.Code || company?.CorporateName || '-',
        branch: branch?.Code || branch?.Description || '-',
        module: module?.id || module?.name || module?.description || '-'
      };
    } catch {
      this.sessionContext = {
        company: '-',
        branch: '-',
        module: '-'
      };
    }
  }

  public getUserThreadInfo(): void {
    const threadInfo = this.proThreadInfoService.proThreadInfo;

    this.userContext = {
      id: threadInfo?.userId || '-',
      login: threadInfo?.userName || '-',
      name: threadInfo?.userName || '-'
    };

    this.proThreadInfoService.getUserInfoThread().subscribe({
      next: userInfo => {
        const userLabel = userInfo?.displayName || userInfo?.userName || threadInfo?.userName || 'Usuario';
        const nextItems = [...this.menuItems];

        nextItems[0] = {
          ...nextItems[0],
          label: userLabel,
          shortLabel: userInfo?.userName || threadInfo?.userName || userLabel
        };

        this.userContext = {
          id: userInfo?.id || threadInfo?.userId || '-',
          login: userInfo?.userName || threadInfo?.userName || '-',
          name: userLabel
        };

        this.menuItems = nextItems;
      }
    });
  }

  public exitRoutine(askBeforeClose = false): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose(askBeforeClose);
      return;
    }

    this.notification.information('Aplicacao em desenvolvimento local.');
    this.router.navigateByUrl('/');
  }
}
