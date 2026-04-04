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

@Injectable({
  providedIn: 'root'
})
export class PowerBiUserService {
  private readonly http = inject(HttpClient);
  private readonly usersEndpoint = 'http://localhost:8181/rest/userbi';
  private readonly storageKey = 'power-bi-users';

  private readonly seedData: PowerBiUser[] = [
    {
      id: 1,
      userCode: 'USR-001',
      name: 'ANA EXEMPLO',
      email: 'ana.exemplo@organizacao-ficticia.org',
      costCenterCode: 'CC-1001',
      costCenterName: 'CENTRO DE CUSTO A',
      enabled: true
    },
    {
      id: 2,
      userCode: 'USR-002',
      name: 'BRUNO DEMO',
      email: 'bruno.demo@organizacao-ficticia.org',
      costCenterCode: 'CC-2002',
      costCenterName: 'CENTRO DE CUSTO B',
      enabled: true
    },
    {
      id: 3,
      userCode: 'USR-003',
      name: 'CARLA MODELO',
      email: 'carla.modelo@organizacao-ficticia.org',
      costCenterCode: 'CC-3003',
      costCenterName: 'CENTRO DE CUSTO C',
      enabled: true
    },
    {
      id: 4,
      userCode: 'USR-004',
      name: 'DANIEL TESTE',
      email: 'daniel.teste@organizacao-ficticia.org',
      costCenterCode: 'CC-4004',
      costCenterName: 'CENTRO DE CUSTO D',
      enabled: true
    },
    {
      id: 5,
      userCode: 'USR-005',
      name: 'ELISA QA',
      email: 'elisa.qa@organizacao-ficticia.org',
      costCenterCode: 'CC-5005',
      costCenterName: 'CENTRO DE CUSTO E',
      enabled: false
    },
    {
      id: 6,
      userCode: 'USR-006',
      name: 'FABIO PILOTO',
      email: 'fabio.piloto@organizacao-ficticia.org',
      costCenterCode: 'CC-6006',
      costCenterName: 'CENTRO DE CUSTO F',
      enabled: true
    },
    {
      id: 7,
      userCode: 'USR-007',
      name: 'GABRIELA SAMPLE',
      email: 'gabriela.sample@organizacao-ficticia.org',
      costCenterCode: 'CC-7007',
      costCenterName: 'CENTRO DE CUSTO G',
      enabled: true
    },
    {
      id: 8,
      userCode: 'USR-008',
      name: 'HEITOR STAGING',
      email: 'heitor.staging@organizacao-ficticia.org',
      costCenterCode: 'CC-8008',
      costCenterName: 'CENTRO DE CUSTO H',
      enabled: true
    }
  ];

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
      this.save(this.seedData);
      return [...this.seedData];
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
