// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 09: Finance ERP Controller (/api/v1/finance)
// ============================================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller('api/v1/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  async getChartOfAccounts() {
    return this.financeService.getChartOfAccounts();
  }

  @Get('invoices')
  async getInvoices() {
    return this.financeService.getInvoices();
  }

  @Post('payments')
  async recordPayment(@Body() body: any) {
    return this.financeService.recordPayment(body);
  }
}
