export interface PowerBiUser {
  id: number;
  userCode: string;
  name: string;
  email: string;
  costCenterCode: string;
  costCenterName: string;
  enabled: boolean;
}

export type PowerBiUserUpsert = Omit<PowerBiUser, 'id'>;
