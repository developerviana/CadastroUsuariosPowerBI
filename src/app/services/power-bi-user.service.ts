import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { PowerBiUser, PowerBiUserUpsert } from '../models/power-bi-user.model';
import { LOCAL_AUTH_CONFIG } from '../config/local-auth.config';

interface UserBiApiRow {
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
  rows?: UserBiApiRow[];
}

interface UserBiSearchRow {
  usuario?: string;
  nome?: string;
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
  private readonly usersEndpoint = '/rest/userbi';
  private readonly systemUsersSearchEndpoint = '/rest/UserBI/search';
  private readonly costCentersSearchEndpoint = '/rest/UserBI/cost-center/search';
  private readonly storageKey = 'power-bi-users';

  public getAll(): Observable<PowerBiUser[]> {
    return this.http.get<UserBiApiResponse>(this.usersEndpoint, {
      headers: this.getBasicAuthHeaders()
    }).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map((row, index) => this.mapApiRowToUser(row, index));
      })
    );
  }

  public create(payload: PowerBiUserUpsert): Observable<PowerBiUser> {
    const users = this.load();
    const nextId = users.length > 0 ? Math.max(...users.map(item => item.id)) + 1 : 1;
    const createdUser: PowerBiUser = { id: nextId, ...payload };

    users.unshift(createdUser);
    this.save(users);

    return of(createdUser);
  }

  public searchSystemUsersByName(term: string): Observable<Array<{ usuario: string; nome: string }>> {
    const cTerm = encodeURIComponent(term.trim());
    return this.http.get<UserBiSearchResponse>(`${this.systemUsersSearchEndpoint}/${cTerm}`, {
      headers: this.getBasicAuthHeaders()
    }).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map(row => ({
          usuario: row.usuario ?? '',
          nome: row.nome ?? ''
        }));
      })
    );
  }

  public searchCostCentersByTerm(term: string): Observable<Array<{ ccusto: string; ccnome: string }>> {
    const cTerm = encodeURIComponent(term.trim());
    return this.http.get<CostCenterSearchResponse>(`${this.costCentersSearchEndpoint}/${cTerm}`, {
      headers: this.getBasicAuthHeaders()
    }).pipe(
      map(response => {
        const rows = response?.rows ?? [];
        return rows.map(row => ({
          ccusto: row.ccusto ?? '',
          ccnome: row.ccnome ?? ''
        }));
      })
    );
  }

  public update(id: number, payload: PowerBiUserUpsert): Observable<PowerBiUser> {
    const users = this.load();
    const index = users.findIndex(item => item.id === id);

    if (index < 0) {
      throw new Error('User not found');
    }

    const updatedUser: PowerBiUser = { id, ...payload };
    users[index] = updatedUser;
    this.save(users);

    return of(updatedUser);
  }

  public delete(id: number): Observable<void> {
    const users = this.load().filter(item => item.id !== id);
    this.save(users);
    return of(void 0);
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
    return {
      id: index + 1,
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
