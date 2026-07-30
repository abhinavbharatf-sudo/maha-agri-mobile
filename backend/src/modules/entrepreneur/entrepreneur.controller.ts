// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 06: Entrepreneur ERP Controller (/api/v1/entrepreneurs)
// ============================================================================

import { Controller, Get, Param } from '@nestjs/common';
import { EntrepreneurService } from './entrepreneur.service';

@Controller('api/v1/entrepreneurs')
export class EntrepreneurController {
  constructor(private readonly entrepreneurService: EntrepreneurService) {}

  @Get('products')
  async getProducts() {
    return this.entrepreneurService.getProducts();
  }

  @Get('orders')
  async getSalesOrders() {
    return this.entrepreneurService.getSalesOrders();
  }

  @Get(':id/wallet')
  async getWalletBalance(@Param('id') id: string) {
    return this.entrepreneurService.getWalletBalance(id);
  }
}
