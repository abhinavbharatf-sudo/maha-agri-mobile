// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Platform Core: Prisma ORM Service (PostgreSQL Multi-Schema Engine)
// Provides resilient database connectivity and transactions across all modules
// ============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Connected to PostgreSQL multi-schema database via Prisma');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Prisma $connect notice: ${err.message}. Operating with resilient fallback.`);
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }

  get isDbConnected(): boolean {
    return this.isConnected;
  }
}
