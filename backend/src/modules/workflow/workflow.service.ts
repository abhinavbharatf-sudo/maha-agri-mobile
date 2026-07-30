// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 10: Workflow & SLA Engine Implementation
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class WorkflowService {
  private definitions = [
    {
      key: 'SOIL_TEST_APPROVAL',
      name: 'Soil Test Quality Approval Workflow',
      module: 'SOIL',
      version: 1,
      steps: [
        { sequence: 1, name: 'Parameter Entry', role: 'LAB_TECHNICIAN', slaHours: 24 },
        { sequence: 2, name: 'Quality Check & Sign-off', role: 'LAB_ADMIN', slaHours: 24 },
      ],
    },
  ];

  private tasks = [
    {
      id: 'tsk-001',
      taskTitle: 'Approve Soil Test Report #MA-REQ-000155',
      assignedRole: 'LAB_ADMIN',
      assignedUserName: 'Lab Manager Wardha',
      dueDate: new Date(Date.now() + 172800000).toISOString(),
      status: 'PENDING',
    },
  ];

  async getDefinitions() {
    return { success: true, data: this.definitions, timestamp: new Date().toISOString() };
  }

  async getTasks() {
    return { success: true, data: this.tasks, timestamp: new Date().toISOString() };
  }

  async completeTask(taskId: string, remarks?: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    task.status = 'COMPLETED';
    return {
      success: true,
      message: `Task ${taskId} completed successfully. Workflow instance advanced.`,
      data: task,
      timestamp: new Date().toISOString(),
    };
  }
}
