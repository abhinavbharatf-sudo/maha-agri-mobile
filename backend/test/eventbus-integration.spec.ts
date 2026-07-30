// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 6 Test Suite: Integration 5 - Event Bus & 15 Domain Events Tests
// ============================================================================

import { LocalEventBus } from '../src/modules/integration/adapters/eventbus/local-eventbus.adapter';
import { DomainEventService } from '../src/modules/integration/services/domain-event.service';

describe('DomainEventService (Event Bus Test)', () => {
  let eventBus: LocalEventBus;
  let service: DomainEventService;

  beforeEach(() => {
    eventBus = new LocalEventBus();
    service = new DomainEventService(eventBus);
    service.onModuleInit();
  });

  it('should publish domain event and log in event history', async () => {
    const res = await service.publishDomainEvent(
      'FarmerRegistered',
      'FarmerModule',
      { farmerCode: 'FARM-MH-9999' },
      'corr-test-01',
    );

    expect(res.success).toBe(true);
    expect(res.data.eventType).toBe('FarmerRegistered');
    expect(res.data.correlationId).toBe('corr-test-01');

    const history = service.getEventHistory();
    expect(history.count).toBeGreaterThanOrEqual(1);
  });
});
