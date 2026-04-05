import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, distinctUntilChanged, finalize, of, startWith } from 'rxjs';
import {
  PoButtonModule,
  PoFieldModule,
  PoSelectOption,
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
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  public users: PowerBiUser[] = [];
  public filteredUsers: PowerBiUser[] = [];
  public readonly columns: PoTableColumn[] = [
    { property: 'filial', label: 'Filial' },
    { property: 'userCode', label: 'Usuario' },
    { property: 'name', label: 'Nome' },
    { property: 'email', label: 'E-mail' },
    { property: 'costCenterCode', label: 'C.Custo' },
    { property: 'costCenterName', label: 'Nome C.Custo' },
    {
      property: 'enabled',
      label: 'Status',
      type: 'label',
      labels: [
        { value: true as any, color: 'color-11', label: 'Ativo' },
        { value: false as any, color: 'color-08', label: 'Inativo' }
      ]
    }
  ];
  public isLoading = true;
  public editingRecno: number | null = null;
  public isSearchingSystemUsers = false;
  public systemUsersSelectOptions: PoSelectOption[] = [];
  public systemUsersLookup: Array<{ usuario: string; nome: string; email: string }> = [];
  public userSearchNotice = '';
  public isSearchingCostCenters = false;
  public costCentersSelectOptions: PoSelectOption[] = [];
  public costCentersLookup: Array<{ ccusto: string; ccnome: string }> = [];
  public costCenterSearchNotice = '';

  public readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: unknown) => this.handleEditAction(row)
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
    this.setupFilters();
    this.loadUsers();
    this.setupSystemUserSelectionAutofill();
    this.setupCostCenterSelectionAutofill();
  }

  public get enabledCount(): number {
    return this.users.filter(user => user.enabled).length;
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
    return this.editingRecno ? 'Editar usuario' : 'Novo usuario';
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
    this.editingRecno = null;
    this.systemUsersSelectOptions = [];
    this.systemUsersLookup = [];
    this.costCentersSelectOptions = [];
    this.costCentersLookup = [];
    this.userSearchNotice = '';
    this.costCenterSearchNotice = '';
    this.userForm.reset({
      userCode: '',
      name: '',
      email: '',
      costCenterCode: '',
      costCenterName: '',
      enabled: true
    });
    this.applyCreateModeFieldLocks();
    this.loadSystemUsersForSelect();
    this.loadCostCentersForSelect();
    this.userModal.open();
  }

  public openEditModal(row: PowerBiUser): void {
    this.editingRecno = row.recno;
    this.systemUsersSelectOptions = [];
    this.systemUsersLookup = [];
    this.costCentersSelectOptions = [];
    this.costCentersLookup = [];
    this.userSearchNotice = '';
    this.costCenterSearchNotice = '';
    this.userForm.reset({
      userCode: row.userCode,
      name: row.name,
      email: row.email,
      costCenterCode: row.costCenterCode,
      costCenterName: row.costCenterName,
      enabled: row.enabled
    });
    this.releaseEditModeFieldLocks();
    this.userModal.open();
  }

  public closeModal(): void {
    this.systemUsersSelectOptions = [];
    this.systemUsersLookup = [];
    this.costCentersSelectOptions = [];
    this.costCentersLookup = [];
    this.userSearchNotice = '';
    this.costCenterSearchNotice = '';
    this.userModal.close();
    this.userForm.markAsPristine();
  }

  public selectSystemUserSuggestion(user: { usuario: string; nome: string; email?: string }): void {
    this.userForm.patchValue({
      userCode: user.usuario,
      name: user.nome,
      email: user.email ?? ''
    }, { emitEvent: false });
  }

  public submitForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.warning('Preencha os campos obrigatorios antes de salvar.');
      return;
    }

    const payload = this.userForm.getRawValue() as PowerBiUserUpsert;

    if (this.editingRecno) {
      this.service.update(this.editingRecno, payload).subscribe(() => {
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

  public enableSelectedUsers(): void {
    this.updateSelectedUsers(true, 'ativados');
  }

  public disableSelectedUsers(): void {
    this.updateSelectedUsers(false, 'inativados');
  }

  public clearFilters(): void {
    this.filtersForm.reset({
      term: '',
      onlyEnabled: false
    });
  }

  public refreshUsers(): void {
    this.loadUsers();
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
        this.syncFilteredUsers();
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Nao foi possivel carregar os usuarios.');
        this.isLoading = false;
      }
    });
  }

  private setupFilters(): void {
    this.filtersForm.valueChanges
      .pipe(
        startWith(this.filtersForm.getRawValue()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.syncFilteredUsers();
      });
  }

  private setupSystemUserSelectionAutofill(): void {
    this.userForm.controls.userCode.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(selectedUserCode => {
        if (this.editingRecno || !selectedUserCode) {
          return;
        }

        const selectedUser = this.systemUsersLookup.find(user => user.usuario === selectedUserCode);

        if (!selectedUser) {
          return;
        }

        this.userForm.patchValue({
          name: selectedUser.nome,
          email: selectedUser.email
        }, { emitEvent: false });
      });
  }

  private loadSystemUsersForSelect(): void {
    this.isSearchingSystemUsers = true;
    this.userSearchNotice = '';

    this.service.searchSystemUsersByName('')
      .pipe(
        catchError(() => {
          this.userSearchNotice = 'Nao foi possivel carregar a lista de usuarios.';
          return of([] as Array<{ usuario: string; nome: string; email: string }>);
        }),
        finalize(() => {
          this.isSearchingSystemUsers = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(users => {
        this.systemUsersLookup = users;
        this.systemUsersSelectOptions = users.map(user => ({
          value: user.usuario,
          label: `${user.usuario} - ${user.nome}`
        }));

        if (this.systemUsersSelectOptions.length === 0 && !this.userSearchNotice) {
          this.userSearchNotice = 'Nenhum usuario disponivel para selecao.';
        }
      });
  }

  private applyCreateModeFieldLocks(): void {
    this.userForm.controls.name.disable({ emitEvent: false });
    this.userForm.controls.email.disable({ emitEvent: false });
    this.userForm.controls.costCenterName.disable({ emitEvent: false });
  }

  private releaseEditModeFieldLocks(): void {
    this.userForm.controls.name.enable({ emitEvent: false });
    this.userForm.controls.email.enable({ emitEvent: false });
    this.userForm.controls.costCenterName.enable({ emitEvent: false });
  }

  private setupCostCenterSelectionAutofill(): void {
    this.userForm.controls.costCenterCode.valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(selectedCostCenterCode => {
        if (this.editingRecno || !selectedCostCenterCode) {
          return;
        }

        const selectedCostCenter = this.costCentersLookup.find(costCenter => costCenter.ccusto === selectedCostCenterCode);

        if (!selectedCostCenter) {
          return;
        }

        this.userForm.patchValue({
          costCenterName: selectedCostCenter.ccnome
        }, { emitEvent: false });
      });
  }

  private loadCostCentersForSelect(): void {
    this.isSearchingCostCenters = true;
    this.costCenterSearchNotice = '';

    this.service.searchCostCentersByTerm('')
      .pipe(
        catchError(() => {
          this.costCenterSearchNotice = 'Nao foi possivel carregar a lista de centros de custo.';
          return of([] as Array<{ ccusto: string; ccnome: string }>);
        }),
        finalize(() => {
          this.isSearchingCostCenters = false;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(costCenters => {
        this.costCentersLookup = costCenters;
        this.costCentersSelectOptions = costCenters.map(costCenter => ({
          value: costCenter.ccusto,
          label: `${costCenter.ccusto} - ${costCenter.ccnome}`
        }));

        if (this.costCentersSelectOptions.length === 0 && !this.costCenterSearchNotice) {
          this.costCenterSearchNotice = 'Nenhum centro de custo disponivel para selecao.';
        }
      });
  }

  private updateSelectedUsers(enabled: boolean, statusLabel: 'ativados' | 'inativados'): void {
    const selectedUsers = this.getSelectedUsers();

    if (selectedUsers.length === 0) {
      return;
    }

    this.service.updateUsersStatus(selectedUsers.map(user => user.recno), enabled).subscribe({
      next: () => {
        this.notification.success(`Usuarios ${statusLabel} com sucesso.`);
        this.loadUsers();
      },
      error: () => {
        this.notification.error(`Nao foi possivel atualizar os usuarios.`);
      }
    });
  }

  private handleEditAction(row: unknown): void {
    if (this.isUserRow(row)) {
      this.openEditModal(row);
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
      typeof user['recno'] === 'number' &&
      typeof user['userCode'] === 'string' &&
      typeof user['name'] === 'string' &&
      typeof user['email'] === 'string' &&
      typeof user['costCenterCode'] === 'string' &&
      typeof user['costCenterName'] === 'string' &&
      typeof user['enabled'] === 'boolean'
    );
  }

  private syncFilteredUsers(): void {
    const term = this.filtersForm.controls.term.value.trim().toLowerCase();
    const onlyEnabled = this.filtersForm.controls.onlyEnabled.value;

    this.filteredUsers = this.users.filter(user => {
      const matchesTerm =
        term.length === 0 ||
        [user.filial, user.userCode, user.name, user.email, user.costCenterCode, user.costCenterName]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesEnabled = !onlyEnabled || user.enabled;

      return matchesTerm && matchesEnabled;
    });
  }
}
