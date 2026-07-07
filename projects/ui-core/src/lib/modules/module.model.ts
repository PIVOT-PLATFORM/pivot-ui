export type ModuleStatus = 'online' | 'preview' | 'offline';

export interface PivotModuleDto {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  status: ModuleStatus;
}

/** Raw DTO returned by GET /api/modules/{id}/status. */
export interface ModuleStatusDto {
  enabled: boolean;
}
