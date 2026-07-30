// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase 5 Integration 5: Event Bus Adapter Interface (Adapter Pattern)
// ============================================================================

export type DomainEventType =
  | 'FarmerRegistered'
  | 'SoilSampleCollected'
  | 'SoilReportGenerated'
  | 'PaymentCaptured'
  | 'PaymentRefunded'
  | 'AppointmentIssued'
  | 'AppointmentAccepted'
  | 'EDPEnrollmentCreated'
  | 'DroneMissionScheduled'
  | 'DroneMissionCompleted'
  | 'NotificationQueued'
  | 'NotificationDelivered'
  | 'DocumentGenerated'
  | 'WorkflowApproved'
  | 'WorkflowRejected';

export interface DomainEventPayload<T = any> {
  eventId: string;
  eventType: DomainEventType;
  publisherModule: string;
  correlationId: string;
  idempotencyKey?: string;
  timestamp: string;
  data: T;
}

export type EventHandler<T = any> = (event: DomainEventPayload<T>) => Promise<void>;

export interface IEventBus {
  readonly providerName: string;

  publish<T = any>(event: DomainEventPayload<T>): Promise<void>;
  subscribe<T = any>(eventType: DomainEventType, handler: EventHandler<T>): void;
  getDeadLetterQueue(): Promise<DomainEventPayload[]>;
}
