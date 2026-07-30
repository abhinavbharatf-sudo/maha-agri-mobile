/**
 * Universal Numbering Engine
 * Location: /src/core/numbering/NumberingEngine.ts
 * Generates sequential standardized codes (MA-EMP-000001, MA-CAN-000001, MA-FAR-000001, etc.)
 */

export class NumberingEngine {
  private static sequenceCounters: Map<string, number> = new Map([
    ['CANDIDATE', 154],
    ['FARMER', 420],
    ['STAFF', 12],
    ['MAHA_AGRIDOOT', 85],
    ['FIELD_VISIT', 1042],
    ['SURVEY', 230],
    ['PAYMENT', 890],
    ['PROJECT', 5],
    ['SERVICE', 12],
  ]);

  private static prefixes: Map<string, string> = new Map([
    ['CANDIDATE', 'MA-CAN'],
    ['FARMER', 'MA-FAR'],
    ['STAFF', 'MA-EMP'],
    ['MAHA_AGRIDOOT', 'MA-AGT'],
    ['FIELD_VISIT', 'MA-FV'],
    ['SURVEY', 'MA-SUR'],
    ['PAYMENT', 'MA-PAY'],
    ['PROJECT', 'MA-PRJ'],
    ['SERVICE', 'MA-SRV'],
  ]);

  /**
   * Generate next sequential code for any entity type
   */
  public static generateCode(entityCode: string, paddingLength: number = 6): string {
    const prefix = this.prefixes.get(entityCode.toUpperCase()) || `MA-${entityCode.substring(0, 3).toUpperCase()}`;
    const current = (this.sequenceCounters.get(entityCode.toUpperCase()) || 0) + 1;
    this.sequenceCounters.set(entityCode.toUpperCase(), current);

    const paddedNumber = String(current).padStart(paddingLength, '0');
    return `${prefix}-${paddedNumber}`;
  }
}
