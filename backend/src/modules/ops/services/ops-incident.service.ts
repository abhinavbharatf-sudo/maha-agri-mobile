// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Phase B Module 2: Incident Management System Service (P1 - P4 Severity)
// Zero business logic modifications to Core/EDP/Soil. Pure Operational Layer.
// ============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export enum IncidentSeverity {
  P1_CRITICAL = 'P1_CRITICAL',
  P2_MAJOR = 'P2_MAJOR',
  P3_MINOR = 'P3_MINOR',
  P4_COSMETIC = 'P4_COSMETIC',
}

@Injectable()
export class OpsIncidentService {
  private readonly logger = new Logger(OpsIncidentService.name);
  private incidentsMap = new Map<string, any>();

  async registerIncident(params: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    moduleName: string;
    districtId?: string;
    reportedByUserId: string;
  }) {
    const incidentId = `inc-${Date.now()}`;
    const incidentCode = `INC-${Date.now().toString().slice(-6)}`;

    const incident = {
      id: incidentId,
      incidentCode,
      title: params.title,
      description: params.description,
      severity: params.severity,
      status: 'LOGGED',
      moduleName: params.moduleName,
      districtId: params.districtId,
      reportedByUserId: params.reportedByUserId,
      createdAt: new Date().toISOString(),
    };

    this.incidentsMap.set(incidentId, incident);
    this.logger.log(`[Phase B Ops Incident] Logged ${params.severity} Incident ${incidentCode} for module ${params.moduleName}`);

    return { success: true, message: 'Incident registered in Operational Governance System', data: incident };
  }

  async resolveIncident(incidentId: string, rootCauseAnalysis: string, resolutionNotes: string, resolverUserId: string) {
    const incident = this.incidentsMap.get(incidentId);
    if (!incident) throw new NotFoundException(`Incident ${incidentId} not found`);

    incident.status = 'RESOLVED';
    incident.rootCauseAnalysis = rootCauseAnalysis;
    incident.resolutionNotes = resolutionNotes;
    incident.resolvedAt = new Date().toISOString();

    return { success: true, message: 'Incident marked as RESOLVED with Root Cause Analysis', data: incident };
  }

  async getAllIncidents() {
    return { success: true, data: Array.from(this.incidentsMap.values()) };
  }
}
