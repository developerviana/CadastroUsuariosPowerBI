import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, merge, of, switchMap } from 'rxjs';
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
  public isEditModalLoading = false;
  public systemUserOptions: Array<{ label: string; value: string; nome: string; email: string }> = [];
  public systemUserResults: Array<{ usuario: string; nome: string; email: string }> = [];
  public costCenterOptions: Array<{ label: string; value: string; ccnome: string }> = [];
  public costCenterResults: Array<{ ccusto: string; ccnome: string }> = [];
  public selectedSystemUserCode = '';
  public selectedCostCenterCode = '';

  private readonly minAutocompleteSearchLength = 1;

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
      disabled: this.userForm.invalid || this.isEditModalLoading
    };
  }

  public readonly secondaryModalAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.closeModal()
  };

  public openCreateModal(): void {
    this.editingRecno = null;
    this.systemUserOptions = [];
    this.systemUserResults = [];
    this.costCenterOptions = [];
    this.costCenterResults = [];
    this.selectedSystemUserCode = '';
    this.selectedCostCenterCode = '';
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
    this.isEditModalLoading = true;
    this.editingRecno = row.recno;
    this.selectedSystemUserCode = row.userCode;
    this.selectedCostCenterCode = row.costCenterCode;
    this.systemUserOptions = [];
    this.systemUserResults = [];
    this.costCenterOptions = [];
    this.costCenterResults = [];

    this.userForm.reset(
      {
        userCode: '',
        name: row.name,
        email: row.email,
        costCenterCode: '',
        costCenterName: row.costCenterName,
        enabled: row.enabled
      },
      { emitEvent: false }
    );

    this.userModal.open();

    forkJoin({
      systemUsers: this.getSystemUsersByTerm(row.userCode, row.name),
      costCenters: this.getCostCentersByTerm(row.costCenterCode, row.costCenterName)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ systemUsers, costCenters }) => {
        const mergedSystemUsers = this.ensureCurrentSystemUser(systemUsers, row);
        const mergedCostCenters = this.ensureCurrentCostCenter(costCenters, row);

        this.systemUserResults = mergedSystemUsers;
        this.systemUserOptions = mergedSystemUsers.map(user => ({
          label: user.usuario,
          value: user.usuario,
          nome: user.nome,
          email: user.email
        }));

        this.costCenterResults = mergedCostCenters;
        this.costCenterOptions = mergedCostCenters.map(costCenter => ({
          label: costCenter.ccusto,
          value: costCenter.ccusto,
          ccnome: costCenter.ccnome
        }));

        this.userForm.reset(
          {
            userCode: row.userCode,
            name: row.name,
            email: row.email,
            costCenterCode: row.costCenterCode,
            costCenterName: row.costCenterName,
            enabled: row.enabled
          },
          { emitEvent: false }
        );

        this.isEditModalLoading = false;
      });
  }

  public closeModal(): void {
    this.isEditModalLoading = false;
    this.systemUserOptions = [];
    this.systemUserResults = [];
    this.costCenterOptions = [];
    this.costCenterResults = [];
    this.selectedSystemUserCode = '';
    this.selectedCostCenterCode = '';
    this.userModal.close();
    this.userForm.markAsPristine();
  }

  public onSystemUserChange(event: string | { value?: string }): void {
    if (this.isEditModalLoading) {
      return;
    }

    const value = this.extractComboValue(event);

    if (value) {
      const selectedUserOption = this.systemUserOptions.find(user => this.normalize(user.value) === this.normalize(value));
      const selectedUser = selectedUserOption
        ? {
            usuario: selectedUserOption.value,
            nome: selectedUserOption.nome,
            email: selectedUserOption.email
          }
        : this.systemUserResults.find(user => this.normalize(user.usuario) === this.normalize(value));

      if (selectedUser) {
        this.selectedSystemUserCode = value;
        this.userForm.patchValue({
          userCode: selectedUser.usuario,
          name: selectedUser.nome,
          email: selectedUser.email
        }, { emitEvent: false });
        return;
      }

      // Fallback defensivo: busca por código para garantir preenchimento do nome/e-mail.
      this.searchSystemUsersWithFallback(value, value)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(users => {
          const matchedUser = users.find(user => this.normalize(user.usuario) === this.normalize(value)) ?? users[0];

          if (!matchedUser) {
            return;
          }

          this.selectedSystemUserCode = matchedUser.usuario;
          this.userForm.patchValue({
            userCode: matchedUser.usuario,
            name: matchedUser.nome,
            email: matchedUser.email
          }, { emitEvent: false });
        });
    }
  }

  public onSystemUserFocus(): void {
    if (this.isEditModalLoading) {
      return;
    }

    // Ao abrir a seta do combo, tenta carregar lista para exibição imediata.
    if (this.systemUserOptions.length === 0) {
      this.loadSystemUsersByTerm('');
    }
  }

  public onSystemUserInputChange(event: string | { value?: string }): void {
    if (this.isEditModalLoading) {
      return;
    }

    const term = this.extractComboValue(event);
    this.loadSystemUsersByTerm(term);
  }

  public onCostCenterChange(event: string | { value?: string }): void {
    if (this.isEditModalLoading) {
      return;
    }

    const value = this.extractComboValue(event);

    if (value) {
      const selectedCostCenterOption = this.costCenterOptions.find(costCenter => this.normalize(costCenter.value) === this.normalize(value));
      const selectedCostCenter = selectedCostCenterOption
        ? {
            ccusto: selectedCostCenterOption.value,
            ccnome: selectedCostCenterOption.ccnome
          }
        : this.costCenterResults.find(costCenter => this.normalize(costCenter.ccusto) === this.normalize(value));

      if (selectedCostCenter) {
        this.selectedCostCenterCode = value;
        this.userForm.patchValue({
          costCenterCode: selectedCostCenter.ccusto,
          costCenterName: selectedCostCenter.ccnome
        }, { emitEvent: false });
        return;
      }

      // Fallback defensivo: busca por código para garantir preenchimento do nome do C.Custo.
      this.searchCostCentersWithFallback(value, value)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(costCenters => {
          const matchedCostCenter = costCenters.find(cc => this.normalize(cc.ccusto) === this.normalize(value)) ?? costCenters[0];

          if (!matchedCostCenter) {
            return;
          }

          this.selectedCostCenterCode = matchedCostCenter.ccusto;
          this.userForm.patchValue({
            costCenterCode: matchedCostCenter.ccusto,
            costCenterName: matchedCostCenter.ccnome
          }, { emitEvent: false });
        });
    }
  }

  public onCostCenterFocus(): void {
    if (this.isEditModalLoading) {
      return;
    }

    // Ao abrir a seta do combo, tenta carregar lista para exibição imediata.
    if (this.costCenterOptions.length === 0) {
      this.loadCostCentersByTerm('');
    }
  }

  public onCostCenterInputChange(event: string | { value?: string }): void {
    if (this.isEditModalLoading) {
      return;
    }

    const term = this.extractComboValue(event);
    this.loadCostCentersByTerm(term);
  }

  public submitForm(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.notification.warning('Preencha os campos obrigatorios antes de salvar.');
      return;
    }

    if (!this.hasValidSelections()) {
      this.notification.warning('Selecione Usuario e C.Custo a partir da lista antes de salvar.');
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
    this.userForm.controls.userCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(userCode => {
        if ((userCode ?? '').trim() !== this.selectedSystemUserCode) {
          this.selectedSystemUserCode = '';
        }
      });

    merge(
      this.userForm.controls.userCode.valueChanges,
      this.userForm.controls.name.valueChanges
    )
      .pipe(
        map(() => ({
          codeTerm: this.userForm.controls.userCode.value.trim(),
          nameTerm: this.userForm.controls.name.value.trim()
        })),
        debounceTime(150),
        distinctUntilChanged((previous, current) => {
          return previous.codeTerm === current.codeTerm && previous.nameTerm === current.nameTerm;
        }),
        switchMap(({ codeTerm, nameTerm }) => {
          return this.searchSystemUsersWithFallback(codeTerm, nameTerm);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(users => {
        this.systemUserResults = users;
        this.systemUserOptions = users.map(user => ({
          label: user.usuario,
          value: user.usuario,
          nome: user.nome,
          email: user.email
        }));
      });
  }

  private setupCostCenterSearch(): void {
    this.userForm.controls.costCenterCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(costCenterCode => {
        if ((costCenterCode ?? '').trim() !== this.selectedCostCenterCode) {
          this.selectedCostCenterCode = '';
        }
      });

    merge(
      this.userForm.controls.costCenterCode.valueChanges,
      this.userForm.controls.costCenterName.valueChanges
    )
      .pipe(
        map(() => ({
          codeTerm: this.userForm.controls.costCenterCode.value.trim(),
          nameTerm: this.userForm.controls.costCenterName.value.trim()
        })),
        debounceTime(150),
        distinctUntilChanged((previous, current) => {
          return previous.codeTerm === current.codeTerm && previous.nameTerm === current.nameTerm;
        }),
        switchMap(({ codeTerm, nameTerm }) => {
          return this.searchCostCentersWithFallback(codeTerm, nameTerm);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(costCenters => {
        this.costCenterResults = costCenters;
        this.costCenterOptions = costCenters.map(cc => ({
          label: cc.ccusto,
          value: cc.ccusto,
          ccnome: cc.ccnome
        }));
      });
  }

  private searchSystemUsersWithFallback(
    codeTerm: string,
    nameTerm: string
  ) {
    const normalizedCode = codeTerm.trim();
    const normalizedName = nameTerm.trim();

    if (normalizedCode.length >= this.minAutocompleteSearchLength) {
      return this.service.searchSystemUsersByName(normalizedCode).pipe(
        switchMap(results => {
          if (results.length > 0) {
            return of(results);
          }

          if (normalizedName.length >= this.minAutocompleteSearchLength && normalizedName !== normalizedCode) {
            return this.service.searchSystemUsersByName(normalizedName);
          }

          return of([] as Array<{ usuario: string; nome: string; email: string }>);
        }),
        catchError(() => of([] as Array<{ usuario: string; nome: string; email: string }>))
      );
    }

    if (normalizedName.length >= this.minAutocompleteSearchLength) {
      return this.service.searchSystemUsersByName(normalizedName).pipe(
        catchError(() => of([] as Array<{ usuario: string; nome: string; email: string }>))
      );
    }

    return of([] as Array<{ usuario: string; nome: string; email: string }>);
  }

  private searchCostCentersWithFallback(
    codeTerm: string,
    nameTerm: string
  ) {
    const normalizedCode = codeTerm.trim();
    const normalizedName = nameTerm.trim();

    if (normalizedCode.length >= this.minAutocompleteSearchLength) {
      return this.service.searchCostCentersByTerm(normalizedCode).pipe(
        switchMap(results => {
          if (results.length > 0) {
            return of(results);
          }

          if (normalizedName.length >= this.minAutocompleteSearchLength && normalizedName !== normalizedCode) {
            return this.service.searchCostCentersByTerm(normalizedName);
          }

          return of([] as Array<{ ccusto: string; ccnome: string }>);
        }),
        catchError(() => of([] as Array<{ ccusto: string; ccnome: string }>))
      );
    }

    if (normalizedName.length >= this.minAutocompleteSearchLength) {
      return this.service.searchCostCentersByTerm(normalizedName).pipe(
        catchError(() => of([] as Array<{ ccusto: string; ccnome: string }>))
      );
    }

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

  private loadSystemUsersByTerm(term: string): void {
    const normalizedTerm = term.trim();
    this.getSystemUsersByTerm(normalizedTerm, normalizedTerm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(users => {
        this.systemUserResults = users;
        this.systemUserOptions = users.map(user => ({
          label: user.usuario,
          value: user.usuario,
          nome: user.nome,
          email: user.email
        }));
      });
  }

  private loadCostCentersByTerm(term: string): void {
    const normalizedTerm = term.trim();
    this.getCostCentersByTerm(normalizedTerm, normalizedTerm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(costCenters => {
        this.costCenterResults = costCenters;
        this.costCenterOptions = costCenters.map(cc => ({
          label: cc.ccusto,
          value: cc.ccusto,
          ccnome: cc.ccnome
        }));
      });
  }

  private getSystemUsersByTerm(codeTerm: string, nameTerm: string) {
    return this.searchSystemUsersWithFallback(codeTerm, nameTerm).pipe(
      map(users => {
        if (users.length > 0) {
          return users;
        }

        if (codeTerm.trim() || nameTerm.trim()) {
          return [
            {
              usuario: codeTerm.trim(),
              nome: nameTerm.trim(),
              email: this.userForm.controls.email.value.trim()
            }
          ].filter(user => user.usuario.length > 0);
        }

        return this.users.map(user => ({
          usuario: user.userCode,
          nome: user.name,
          email: user.email
        }));
      })
    );
  }

  private getCostCentersByTerm(codeTerm: string, nameTerm: string) {
    return this.searchCostCentersWithFallback(codeTerm, nameTerm).pipe(
      map(costCenters => {
        if (costCenters.length > 0) {
          return costCenters;
        }

        if (codeTerm.trim() || nameTerm.trim()) {
          return [
            {
              ccusto: codeTerm.trim(),
              ccnome: nameTerm.trim()
            }
          ].filter(costCenter => costCenter.ccusto.length > 0);
        }

        const uniqueCostCenters = new Map<string, { ccusto: string; ccnome: string }>();
        this.users.forEach(user => {
          if (!uniqueCostCenters.has(user.costCenterCode)) {
            uniqueCostCenters.set(user.costCenterCode, {
              ccusto: user.costCenterCode,
              ccnome: user.costCenterName
            });
          }
        });

        return Array.from(uniqueCostCenters.values());
      })
    );
  }

  private ensureCurrentSystemUser(
    users: Array<{ usuario: string; nome: string; email: string }>,
    row: PowerBiUser
  ): Array<{ usuario: string; nome: string; email: string }> {
    const currentUser = {
      usuario: row.userCode,
      nome: row.name,
      email: row.email
    };

    const filteredUsers = users.filter(user => this.normalize(user.usuario) !== this.normalize(row.userCode));
    return [currentUser, ...filteredUsers];
  }

  private ensureCurrentCostCenter(
    costCenters: Array<{ ccusto: string; ccnome: string }>,
    row: PowerBiUser
  ): Array<{ ccusto: string; ccnome: string }> {
    const currentCostCenter = {
      ccusto: row.costCenterCode,
      ccnome: row.costCenterName
    };

    const filteredCostCenters = costCenters.filter(costCenter => this.normalize(costCenter.ccusto) !== this.normalize(row.costCenterCode));
    return [currentCostCenter, ...filteredCostCenters];
  }

  private extractComboValue(event: string | { value?: string }): string {
    if (typeof event === 'string') {
      return event;
    }

    return (event?.value ?? '').toString();
  }

  private normalize(value: string): string {
    return (value ?? '').trim().toUpperCase();
  }

  private hasValidSelections(): boolean {
    const selectedUserCode = this.userForm.controls.userCode.value.trim();
    const selectedCostCenterCode = this.userForm.controls.costCenterCode.value.trim();

    if (!selectedUserCode || !selectedCostCenterCode) {
      return false;
    }

    const selectedUserMatchesState = this.normalize(selectedUserCode) === this.normalize(this.selectedSystemUserCode);
    const selectedCostCenterMatchesState = this.normalize(selectedCostCenterCode) === this.normalize(this.selectedCostCenterCode);

    const selectedUserExistsInList =
      this.systemUserOptions.some(user => this.normalize(user.value) === this.normalize(selectedUserCode)) ||
      this.systemUserResults.some(user => this.normalize(user.usuario) === this.normalize(selectedUserCode));

    const selectedCostCenterExistsInList =
      this.costCenterOptions.some(costCenter => this.normalize(costCenter.value) === this.normalize(selectedCostCenterCode)) ||
      this.costCenterResults.some(costCenter => this.normalize(costCenter.ccusto) === this.normalize(selectedCostCenterCode));

    return (selectedUserMatchesState || selectedUserExistsInList) &&
      (selectedCostCenterMatchesState || selectedCostCenterExistsInList);
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
