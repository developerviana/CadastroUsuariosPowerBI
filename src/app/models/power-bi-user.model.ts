export interface PowerBiUser {
  id: number;
  recno: number;
  filial: string;
  userCode: string;
  name: string;
  email: string;
  costCenterCode: string;
  costCenterName: string;
  enabled: boolean;
}

export type PowerBiUserUpsert = Omit<PowerBiUser, 'id' | 'recno'>;
