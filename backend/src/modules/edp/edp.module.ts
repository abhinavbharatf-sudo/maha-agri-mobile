import { Module } from '@nestjs/common';
import { EdpStateMachineService } from './services/edp-state-machine.service';
import { EdpLifecycleService } from './services/edp-lifecycle.service';
import { EdpLifecycleController } from './controllers/edp-lifecycle.controller';
import { EdpOperationsController } from './controllers/edp-operations.controller';
import { PlatformCoreModule } from '../platform/platform-core.module';

@Module({
  imports: [PlatformCoreModule],
  controllers: [EdpLifecycleController, EdpOperationsController],
  providers: [EdpStateMachineService, EdpLifecycleService],
  exports: [EdpStateMachineService, EdpLifecycleService],
})
export class EdpModule {}
