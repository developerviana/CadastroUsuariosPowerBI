import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  PoButtonModule,
  PoDialogModule,
  PoDialogService,
  PoFieldModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageModule,
  PoTableComponent,
  PoTableAction,
  PoTableColumn,
  PoTableRowTemplateArrowDirection,
  PoTableModule
} from '@po-ui/ng-components';

import { PowerBiUser, PowerBiUserUpsert } from '../../app/models/power-bi-user.model';
import { PowerBiUserService } from '../../app/services/power-bi-user.service';

@Component({
  selector: 'app-user-access',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PoPageModule,
    PoTableModule,
    PoButtonModule,
    PoModalModule,
    PoDialogModule,
    PoFieldModule,
  ],
  templateUrl: './user-access.component.html',
  styleUrl: './user-access.component.scss',
})
export class UserAccessComponent implements OnInit {
  @ViewChild('userModal', { static: true }) private userModal!: PoModalComponent;
  @ViewChild('userTable') private userTable?: PoTableComponent;

  private readonly service = inject(PowerBiUserService);
  private readonly notification = inject(PoNotificationService);
  private readonly dialogService = inject(PoDialogService);
  private readonly formBuilder = inject(FormBuilder);

  public users: PowerBiUser[] = [];
  public columns: PoTableColumn[] = [];
  public isLoading = true;
  public editingUserId: number | null = null;

  private readonly columnLabelMap: Record<string, string> = {
    id: 'Id',
    userCode: 'Usuario',
    name: 'Nome',
    email: 'E-mail',
    costCenterCode: 'C.Custo',
    costCenterName: 'Nome C.Custo',
    enabled: 'Status'
  };

  public readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: unknown) => this.handleEditAction(row)
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: unknown) => this.handleDeleteAction(row)
    }
  ];

  public readonly userForm = this.formBuilder.nonNullable.group({
    userCode: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    costCenterCode: ['', [Validators.required]],
    costCenterName: ['', [Validators.required]],
    enabled: [true]
  });

  public readonly filtersForm = this.formBuilder.nonNullable.group({
    term: [''],
    onlyEnabled: [false]
  });

  public readonly rowTemplateArrowDirection = PoTableRowTemplateArrowDirection.Right;

  public ngOnInit(): void {
    this.loadUsers();
  }

  public get pageSubtitle(): string {
    return 'Gestão de usuarios habilitados para visualização do Power BI';
  }

  public get enabledCount(): number {
    return this.users.filter(user => user.enabled).length;
  }

  public get filteredUsers(): PowerBiUser[] {
    const term = this.filtersForm.controls.term.value.trim().toLowerCase();
    const onlyEnabled = this.filtersForm.controls.onlyEnabled.value;

    return this.users.filter(user => {
      const matchesTerm =
        term.length === 0 ||
        [user.userCode, user.name, user.email, user.costCenterCode, user.costCenterName]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesEnabled = !onlyEnabled || user.enabled;

      return matchesTerm && matchesEnabled;
    });
  }

  public get selectedUsersCount(): number {
    return this.getSelectedUsers().length;
  }

  public get hasSelectedUsers(): boolean {
    return this.selectedUsersCount > 0;
  }

  public get hasUsers(): boolean {
    return this.users.length > 0;
  }

  public get hasFilteredUsers(): boolean {
    return this.filteredUsers.length > 0;
  }

  public get hasNoUsers(): boolean {
    return this.users.length === 0;
  }

  public get isFilteredEmpty(): boolean {
    return this.hasUsers && !this.hasFilteredUsers;
  }

  public get modalTitle(): string {
    return this.editingUserId ? 'Editar usuario' : 'Novo usuario';
  }

  public get primaryModalAction(): PoModalAction {
    return {
      label: 'Salvar',
      action: () => this.submitForm(),
      disabled: this.userForm.invalid
    };
  }

  public readonly secondaryModalAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.closeModal()
  };

  public openCreateModal(): void {
    this.editingUserId = null;
    this.userForm.reset({
      userCode: '',
      name: '',
      email: '',
      costCenterCode: '',
      costCenterName: '',
      enabled: true
    });
    this.userModal.open();
  }

  public openEditModal(row: PowerBiUser): void {
    this.editingUserId = row.id;
    this.userForm.reset({
      userCode: row.userCode,
      name: row.name,
      email: row.email,
      costCenterCode: row.costCenterCode,
      costCenterName: row.costCenterName,
      enabled: row.enabled
    });
    this.userModal.open();
  }

  public closeModal(): void {
    this.userModal.close();
    this.userForm.markAsPristine();
  }

  public submitForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.warning('Preencha os campos obrigatorios antes de salvar.');
      return;
    }

    const payload = this.userForm.getRawValue() as PowerBiUserUpsert;

    if (this.editingUserId) {
      this.service.update(this.editingUserId, payload).subscribe(() => {
        this.notification.success('Usuario atualizado com sucesso.');
        this.closeModal();
        this.loadUsers();
      });
      return;
    }

    this.service.create(payload).subscribe(() => {
      this.notification.success('Usuario cadastrado com sucesso.');
      this.closeModal();
      this.loadUsers();
    });
  }

  public confirmDelete(row: PowerBiUser): void {
    this.dialogService.confirm({
      title: 'Excluir usuario',
      message: `Deseja realmente excluir o usuario ${row.name}?`,
      confirm: () => {
        this.service.delete(row.id).subscribe(() => {
          this.notification.success('Usuario excluido com sucesso.');
          this.loadUsers();
        });
      }
    });
  }

  public enableSelectedUsers(): void {
    this.updateSelectedUsers(true, 'ativados');
  }

  public disableSelectedUsers(): void {
    this.updateSelectedUsers(false, 'inativados');
  }

  public confirmDeleteSelectedUsers(): void {
    const selectedUsers = this.getSelectedUsers();

    if (selectedUsers.length === 0) {
      return;
    }

    const message =
      selectedUsers.length === 1
        ? `Deseja realmente excluir o usuario ${selectedUsers[0].name}?`
        : `Deseja realmente excluir os ${selectedUsers.length} usuarios selecionados?`;

    this.dialogService.confirm({
      title: 'Excluir usuarios selecionados',
      message,
      confirm: () => {
        selectedUsers.forEach(user => {
          this.service.delete(user.id).subscribe();
        });

        this.notification.success('Usuarios excluidos com sucesso.');
        this.loadUsers();
      }
    });
  }

  public clearFilters(): void {
    this.filtersForm.reset({
      term: '',
      onlyEnabled: false
    });
  }

  public showCreateFromEmptyState(): void {
    this.clearFilters();
    this.openCreateModal();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.service.getAll().subscribe({
      next: users => {
        this.users = users;
        this.columns = this.buildColumnsFromUsers(users);
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Nao foi possivel carregar os usuarios.');
        this.isLoading = false;
      }
    });
  }

  private updateSelectedUsers(enabled: boolean, statusLabel: 'ativados' | 'inativados'): void {
    const selectedUsers = this.getSelectedUsers();

    if (selectedUsers.length === 0) {
      return;
    }

    selectedUsers.forEach(user => {
      this.service.update(user.id, {
        userCode: user.userCode,
        name: user.name,
        email: user.email,
        costCenterCode: user.costCenterCode,
        costCenterName: user.costCenterName,
        enabled
      }).subscribe();
    });

    this.notification.success(`Usuarios ${statusLabel} com sucesso.`);
    this.loadUsers();
  }

  private handleEditAction(row: unknown): void {
    if (this.isUserRow(row)) {
      this.openEditModal(row);
    }
  }

  private handleDeleteAction(row: unknown): void {
    if (this.isUserRow(row)) {
      this.confirmDelete(row);
    }
  }

  private getSelectedUsers(): PowerBiUser[] {
    const selectedRows = this.userTable?.getSelectedRows() ?? [];

    return selectedRows.filter((row): row is PowerBiUser => this.isUserRow(row));
  }

  private isUserRow(row: unknown): row is PowerBiUser {
    if (!row || typeof row !== 'object') {
      return false;
    }

    const user = row as Record<string, unknown>;
    return (
      typeof user['id'] === 'number' &&
      typeof user['userCode'] === 'string' &&
      typeof user['name'] === 'string' &&
      typeof user['email'] === 'string' &&
      typeof user['costCenterCode'] === 'string' &&
      typeof user['costCenterName'] === 'string' &&
      typeof user['enabled'] === 'boolean'
    );
  }

  private buildColumnsFromUsers(users: PowerBiUser[]): PoTableColumn[] {
    if (users.length === 0) {
      return [];
    }

    const firstUser = users[0] as unknown as Record<string, unknown>;
    return Object.keys(firstUser)
      .filter(property => property !== 'id')
      .map((property): PoTableColumn => {
      if (property === 'enabled') {
        return {
          property,
          label: this.toColumnLabel(property),
          type: 'label',
          labels: [
            { value: true as any, color: 'color-11', label: 'Ativo' },
            { value: false as any, color: 'color-08', label: 'Inativo' }
          ]
        };
      }

      return {
        property,
        label: this.toColumnLabel(property)
      };
      });
  }

  private toColumnLabel(property: string): string {
    if (this.columnLabelMap[property]) {
      return this.columnLabelMap[property];
    }

    const normalized = property
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim();

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}
