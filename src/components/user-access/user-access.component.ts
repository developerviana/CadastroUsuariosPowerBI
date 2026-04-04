import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, merge, of, switchMap } from 'rxjs';
import {
  PoButtonModule,
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
  public columns: PoTableColumn[] = [];
  public isLoading = true;
  public editingRecno: number | null = null;
  public isSearchingSystemUsers = false;
  public systemUserSuggestions: Array<{ usuario: string; nome: string }> = [];
  public userSearchNotice = '';
  public isSearchingCostCenters = false;
  public costCenterSuggestions: Array<{ ccusto: string; ccnome: string }> = [];
  public costCenterSearchNotice = '';

  private readonly minAutocompleteSearchLength = 2;

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
    this.setupSystemUserSearch();
    this.setupCostCenterSearch();
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
    this.systemUserSuggestions = [];
    this.costCenterSuggestions = [];
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
    this.userModal.open();
  }

  public openEditModal(row: PowerBiUser): void {
    this.editingRecno = row.recno;
    this.systemUserSuggestions = [];
    this.costCenterSuggestions = [];
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
    this.userModal.open();
  }

  public closeModal(): void {
    this.systemUserSuggestions = [];
    this.costCenterSuggestions = [];
    this.userSearchNotice = '';
    this.costCenterSearchNotice = '';
    this.userModal.close();
    this.userForm.markAsPristine();
  }

  public selectSystemUserSuggestion(user: { usuario: string; nome: string }): void {
    this.userForm.patchValue({
      userCode: user.usuario,
      name: user.nome
    }, { emitEvent: false });
    this.systemUserSuggestions = [];
  }

  public selectCostCenterSuggestion(costCenter: { ccusto: string; ccnome: string }): void {
    this.userForm.patchValue({
      costCenterCode: costCenter.ccusto,
      costCenterName: costCenter.ccnome
    }, { emitEvent: false });
    this.costCenterSuggestions = [];
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
        this.columns = this.buildColumnsFromUsers(users);
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Nao foi possivel carregar os usuarios.');
        this.isLoading = false;
      }
    });
  }

  private setupSystemUserSearch(): void {
    merge(
      this.userForm.controls.userCode.valueChanges,
      this.userForm.controls.name.valueChanges
    )
      .pipe(
        map(() => ({
          codeTerm: this.userForm.controls.userCode.value.trim(),
          nameTerm: this.userForm.controls.name.value.trim()
        })),
        debounceTime(300),
        distinctUntilChanged((previous, current) => {
          return previous.codeTerm === current.codeTerm && previous.nameTerm === current.nameTerm;
        }),
        switchMap(({ codeTerm, nameTerm }) => {
          if (this.editingRecno) {
            this.systemUserSuggestions = [];
            this.isSearchingSystemUsers = false;
            return of([] as Array<{ usuario: string; nome: string }>);
          }

          return this.searchSystemUsersWithFallback(codeTerm, nameTerm);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(users => {
        this.systemUserSuggestions = users;
      });
  }

  private setupCostCenterSearch(): void {
    merge(
      this.userForm.controls.costCenterCode.valueChanges,
      this.userForm.controls.costCenterName.valueChanges
    )
      .pipe(
        map(() => ({
          codeTerm: this.userForm.controls.costCenterCode.value.trim(),
          nameTerm: this.userForm.controls.costCenterName.value.trim()
        })),
        debounceTime(300),
        distinctUntilChanged((previous, current) => {
          return previous.codeTerm === current.codeTerm && previous.nameTerm === current.nameTerm;
        }),
        switchMap(({ codeTerm, nameTerm }) => {
          if (this.editingRecno) {
            this.costCenterSuggestions = [];
            this.isSearchingCostCenters = false;
            return of([] as Array<{ ccusto: string; ccnome: string }>);
          }

          return this.searchCostCentersWithFallback(codeTerm, nameTerm);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(costCenters => {
        this.costCenterSuggestions = costCenters;
      });
  }

  private searchSystemUsersWithFallback(
    codeTerm: string,
    nameTerm: string
  ) {
    const normalizedCode = codeTerm.trim();
    const normalizedName = nameTerm.trim();

    if (normalizedCode.length >= this.minAutocompleteSearchLength) {
      this.isSearchingSystemUsers = true;
      return this.service.searchSystemUsersByName(normalizedCode).pipe(
        switchMap(results => {
          if (results.length > 0) {
            this.userSearchNotice = '';
            return of(results);
          }

          if (normalizedName.length >= this.minAutocompleteSearchLength && normalizedName !== normalizedCode) {
            this.userSearchNotice = 'Nao encontramos pelo codigo. Tentando pelo nome.';
            return this.service.searchSystemUsersByName(normalizedName);
          }

          this.userSearchNotice = 'Nao encontramos pelo codigo. Tente pesquisar pelo nome.';
          return of([] as Array<{ usuario: string; nome: string }>);
        }),
        catchError(() => {
          this.userSearchNotice = '';
          return of([] as Array<{ usuario: string; nome: string }>);
        }),
        finalize(() => {
          this.isSearchingSystemUsers = false;
        })
      );
    }

    if (normalizedName.length >= this.minAutocompleteSearchLength) {
      this.userSearchNotice = '';
      this.isSearchingSystemUsers = true;
      return this.service.searchSystemUsersByName(normalizedName).pipe(
        catchError(() => of([] as Array<{ usuario: string; nome: string }>)),
        finalize(() => {
          this.isSearchingSystemUsers = false;
        })
      );
    }

    this.userSearchNotice = '';
    this.isSearchingSystemUsers = false;
    return of([] as Array<{ usuario: string; nome: string }>);
  }

  private searchCostCentersWithFallback(
    codeTerm: string,
    nameTerm: string
  ) {
    const normalizedCode = codeTerm.trim();
    const normalizedName = nameTerm.trim();

    if (normalizedCode.length >= this.minAutocompleteSearchLength) {
      this.isSearchingCostCenters = true;
      return this.service.searchCostCentersByTerm(normalizedCode).pipe(
        switchMap(results => {
          if (results.length > 0) {
            this.costCenterSearchNotice = '';
            return of(results);
          }

          if (normalizedName.length >= this.minAutocompleteSearchLength && normalizedName !== normalizedCode) {
            this.costCenterSearchNotice = 'Nao encontramos pelo codigo. Tentando pelo nome.';
            return this.service.searchCostCentersByTerm(normalizedName);
          }

          this.costCenterSearchNotice = 'Nao encontramos pelo codigo. Tente pesquisar pelo nome.';
          return of([] as Array<{ ccusto: string; ccnome: string }>);
        }),
        catchError(() => {
          this.costCenterSearchNotice = '';
          return of([] as Array<{ ccusto: string; ccnome: string }>);
        }),
        finalize(() => {
          this.isSearchingCostCenters = false;
        })
      );
    }

    if (normalizedName.length >= this.minAutocompleteSearchLength) {
      this.costCenterSearchNotice = '';
      this.isSearchingCostCenters = true;
      return this.service.searchCostCentersByTerm(normalizedName).pipe(
        catchError(() => of([] as Array<{ ccusto: string; ccnome: string }>)),
        finalize(() => {
          this.isSearchingCostCenters = false;
        })
      );
    }

    this.costCenterSearchNotice = '';
    this.isSearchingCostCenters = false;
    return of([] as Array<{ ccusto: string; ccnome: string }>);
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

  private buildColumnsFromUsers(users: PowerBiUser[]): PoTableColumn[] {
    if (users.length === 0) {
      return [];
    }

    const firstUser = users[0] as unknown as Record<string, unknown>;
    return Object.keys(firstUser)
      .filter(property => property !== 'id' && property !== 'recno')
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
