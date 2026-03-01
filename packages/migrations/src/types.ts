export interface MigrationResult {
  doc: Record<string, unknown>;
  from: string;
  to: string;
  warnings: string[];
  migrated: boolean;
}
