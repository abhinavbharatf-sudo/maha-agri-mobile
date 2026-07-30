/**
 * IMasterImportExportRepository Interface Contract
 * Architecture contract for CSV & Excel Import/Export operations.
 */

export interface ImportResult {
  successCount: number;
  failureCount: number;
  errors: { row: number; column?: string; message: string }[];
}

export interface ExportOptions {
  format: 'CSV' | 'EXCEL';
  fields?: string[];
  filters?: Record<string, unknown>;
}

export interface IMasterImportExportRepository<T = unknown> {
  exportData(masterKey: string, options: ExportOptions): Promise<Blob | string>;
  importData(masterKey: string, fileData: Blob | ArrayBuffer): Promise<ImportResult>;
  getTemplate(masterKey: string): Promise<Blob | string>;
}
