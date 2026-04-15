import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { PowerBiUser, PowerBiUserUpsert } from '../models/power-bi-user.model';
import { LOCAL_AUTH_CONFIG } from '../config/local-auth.config';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

interface UserBiApiRow {
  id?: number;
  recno?: number;
  filial?: string;
  usuario?: string;
  nome?: string;
  email?: string;
  ccusto?: string;
  ccnome?: string;
  status?: string;
}

interface UserBiApiResponse {
  success?: boolean;
  total?: number;
  enabledTotal?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  rows?: UserBiApiRow[];
}

export interface UserBiPagedResult {
  users: PowerBiUser[];
  total: number;
  enabledTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UserBiSearchRow {
  usuario?: string;
  nome?: string;
  email?: string;
}

interface UserBiSearchResponse {
  success?: boolean;
  rows?: UserBiSearchRow[];
}

interface CostCenterSearchRow {
  ccusto?: string;
  ccnome?: string;
}

interface CostCenterSearchResponse {
  success?: boolean;
  rows?: CostCenterSearchRow[];
}

@Injectable({
  providedIn: 'root'
})
export class PowerBiUserService {
  private readonly http = inject(HttpClient);
  private readonly proAppConfigService = inject(ProAppConfigService);
  private readonly usersPath = '/UserBI';
  private readonly usersQueryPath = '/UserBI/query';
  private readonly systemUsersSearchPath = '/UserBI/search';
  private readonly costCentersSearchPath = '/UserBI/cost-center/search';
  private readonly storageKey = 'power-bi-users';

  public getAll(): Observable<PowerBiUser[]> {
    return this.http.get<UserBiApiResponse>(this.resolveApiUrl(this.usersPath), this.getRequestOptions()).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map((row, index) => this.mapApiRowToUser(row, index));
      })
    );
  }

  public query(params: { page: number; pageSize: number; term: string; onlyEnabled: boolean }): Observable<UserBiPagedResult> {
    const safePage = Math.max(1, Math.floor(params.page));
    const safePageSize = Math.max(1, Math.floor(params.pageSize));
    const safeTerm = (params.term ?? '').trim();
    const onlyEnabledText = params.onlyEnabled ? 'true' : 'false';
    const encodedTerm = encodeURIComponent(safeTerm);

    const endpoint = safeTerm.length > 0
      ? `${this.resolveApiUrl(this.usersQueryPath)}/${safePage}/${safePageSize}/${onlyEnabledText}/${encodedTerm}`
      : `${this.resolveApiUrl(this.usersQueryPath)}/${safePage}/${safePageSize}/${onlyEnabledText}`;

    return this.http.get<UserBiApiResponse>(endpoint, this.getRequestOptions()).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        const users = rows.map((row, index) => this.mapApiRowToUser(row, index));

        return {
          users,
          total: Number(response?.total ?? users.length),
          enabledTotal: Number(response?.enabledTotal ?? users.filter(user => user.enabled).length),
          page: Number(response?.page ?? safePage),
          pageSize: Number(response?.pageSize ?? safePageSize),
          totalPages: Math.max(1, Number(response?.totalPages ?? 1))
        };
      })
    );
  }

  public create(payload: PowerBiUserUpsert): Observable<PowerBiUser> {
    return this.http.post<UserBiApiResponse>(this.resolveApiUrl(this.usersPath), payload, this.getRequestOptions()).pipe(
      map(response => {
        const row = response?.rows?.[0];

        if (row) {
          return this.mapApiRowToUser(row, 0);
        }

        return {
          id: 0,
          recno: 0,
          userCode: payload.userCode,
          name: payload.name,
          email: payload.email,
          costCenterCode: payload.costCenterCode,
          costCenterName: payload.costCenterName,
          enabled: payload.enabled
        } as PowerBiUser;
      })
    );
  }

  public searchSystemUsersByName(term: string): Observable<Array<{ usuario: string; nome: string; email: string }>> {
    const cTerm = encodeURIComponent(term.trim());
    return this.http.get<UserBiSearchResponse>(`${this.resolveApiUrl(this.systemUsersSearchPath)}/${cTerm}`, this.getRequestOptions()).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map(row => ({
          usuario: row.usuario ?? '',
          nome: row.nome ?? '',
          email: row.email ?? ''
        }));
      })
    );
  }

  public searchCostCentersByTerm(term: string): Observable<Array<{ ccusto: string; ccnome: string }>> {
    const cTerm = encodeURIComponent(term.trim());
    return this.http.get<CostCenterSearchResponse>(`${this.resolveApiUrl(this.costCentersSearchPath)}/${cTerm}`, this.getRequestOptions()).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map(row => ({
          ccusto: row.ccusto ?? '',
          ccnome: row.ccnome ?? ''
        }));
      })
    );
  }

  public update(recno: number, payload: PowerBiUserUpsert): Observable<PowerBiUser> {
    return this.http.put<UserBiApiResponse>(`${this.resolveApiUrl(this.usersPath)}/${recno}`, payload, this.getRequestOptions()).pipe(
      map(response => {
        const row = response?.rows?.[0];

        if (row) {
          return this.mapApiRowToUser(row, 0);
        }

        return {
          id: recno,
          recno,
          userCode: payload.userCode,
          name: payload.name,
          email: payload.email,
          costCenterCode: payload.costCenterCode,
          costCenterName: payload.costCenterName,
          enabled: payload.enabled
        } as PowerBiUser;
      })
    );
  }

  public delete(id: number): Observable<void> {
    const users = this.load().filter(item => item.id !== id);
    this.save(users);
    return of(void 0);
  }

  public updateUsersStatus(recnos: number[], enabled: boolean): Observable<void> {
    return this.http.patch<UserBiApiResponse>(`${this.resolveApiUrl(this.usersPath)}/status`, {
      recnos: recnos.join(','),
      enabled
    }, this.getRequestOptions()).pipe(
      map(() => void 0)
    );
  }

  private resolveApiUrl(path: string): string {
    if (this.proAppConfigService.insideProtheus()) {
      return path;
    }

    return `/rest${path}`;
  }

  private getRequestOptions(): { headers?: HttpHeaders } {
    if (this.proAppConfigService.insideProtheus()) {
      return {};
    }

    return { headers: this.getBasicAuthHeaders() };
  }

  private load(): PowerBiUser[] {
    const fromStorage = localStorage.getItem(this.storageKey);

    if (!fromStorage) {
      return [];
    }

    return JSON.parse(fromStorage) as PowerBiUser[];
  }

  private save(users: PowerBiUser[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(users));
  }

  private mapApiRowToUser(row: UserBiApiRow, index: number): PowerBiUser {
    const parsedRecno = Number(row.recno ?? 0);
    const id = parsedRecno > 0 ? parsedRecno : Number(row.id ?? index + 1);
    const recno = parsedRecno > 0 ? parsedRecno : id;

    return {
      id,
      recno,
      filial: row.filial ?? '',
      userCode: row.usuario ?? '',
      name: row.nome ?? '',
      email: row.email ?? '',
      costCenterCode: row.ccusto ?? '',
      costCenterName: row.ccnome ?? '',
      enabled: this.toEnabled(row.status)
    };
  }

  private toEnabled(status: string | undefined): boolean {
    const normalizedStatus = (status ?? '').trim().toUpperCase();
    return normalizedStatus !== '1' && normalizedStatus !== 'I' && normalizedStatus !== 'B';
  }

  private getBasicAuthHeaders(): HttpHeaders {
    const credentials = btoa(`${LOCAL_AUTH_CONFIG.user}:${LOCAL_AUTH_CONFIG.password}`);
    return new HttpHeaders({
      Authorization: `Basic ${credentials}`
    });
  }

}
