// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 4 - Document Services & RSA Signer Tests
// ============================================================================

import { LocalStorageProvider } from '../src/modules/integration/adapters/storage/local-storage.adapter';
import { DocumentEngineService } from '../src/modules/integration/services/document-engine.service';

describe('DocumentEngineService (RSA-2048 Signer & QR Verification Test)', () => {
  let storageProvider: LocalStorageProvider;
  let service: DocumentEngineService;

  beforeEach(() => {
    storageProvider = new LocalStorageProvider();
    service = new DocumentEngineService(storageProvider);
  });

  it('should generate official PDF with RSA-2048 signature, SHA-256 hash and QR Seal', async () => {
    const res = await service.generateDocument({
      documentType: 'SOIL_HEALTH_CARD',
      entityId: 'SOIL-SMP-1001',
      title: 'Soil Health Card - Pune District',
      payload: { pH: 6.8, nitrogen: 'Optimal' },
      requestedByUserId: 'usr-admin-01',
    });

    expect(res.success).toBe(true);
    expect(res.data.documentCode).toContain('DOC-SOIL_HEALTH_CARD-');
    expect(res.data.fileHashSha256).toHaveLength(64); // Valid 64-char SHA256 hex string
    expect(res.data.digitalSignature.algorithm).toBe('RSA-2048-SHA256');
    expect(res.data.qrCode).toContain('QR-VERIFY-');
  });

  it('should verify document via public QR verification endpoint', async () => {
    const docRes = await service.generateDocument({
      documentType: 'EDP_CERTIFICATE',
      entityId: 'EDP-CAND-2002',
      title: 'Agri-Entrepreneur Certificate',
      payload: { candidateName: 'Ramesh Patil' },
      requestedByUserId: 'usr-admin-01',
    });

    const qrCode = docRes.data.qrCode;
    const verifyRes = await service.verifyQrCode(qrCode);

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.data.status).toBe('VALID');
    expect(verifyRes.data.documentType).toBe('EDP_CERTIFICATE');
  });
});
