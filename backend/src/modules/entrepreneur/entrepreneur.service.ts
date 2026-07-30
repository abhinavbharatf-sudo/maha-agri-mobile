// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 06: Entrepreneur ERP Service Implementation
// ============================================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class EntrepreneurService {
  private products = [
    { id: 'p-01', code: 'PRD-SEED-01', name: 'BT Cotton Seed Packet (475g)', category: 'Seeds', pricePerUnit: 860.0, stockAvailable: 150 },
    { id: 'p-02', code: 'PRD-FERT-01', name: 'Neem Coated Urea (50kg)', category: 'Fertilizer', pricePerUnit: 266.5, stockAvailable: 400 },
  ];

  private salesOrders = [
    { id: 'so-01', orderNumber: 'SO-2026-07-0012', customerName: 'Ramesh Patil', totalAmount: 2252.0, status: 'DELIVERED', date: '2026-07-22' },
  ];

  async getProducts() {
    return { success: true, data: this.products, timestamp: new Date().toISOString() };
  }

  async getSalesOrders() {
    return { success: true, data: this.salesOrders, timestamp: new Date().toISOString() };
  }

  async getWalletBalance(entrepreneurId: string) {
    return {
      success: true,
      data: {
        entrepreneurId,
        currentBalance: 14850.0,
        currency: 'INR',
        pendingCommission: 1250.0,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
