import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedLoggerModule, zodEnvValidator } from '@orbit/common';
import { ServiceRegistryModule } from '@orbit/service-registry';
import { NotifyEnvSchema } from './config/env.schema';
import { NotifyHealthModule } from './health/notify-health.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: zodEnvValidator(NotifyEnvSchema) }),
    SharedLoggerModule,
    ServiceRegistryModule.forRoot(),
    NotificationsModule,
    NotifyHealthModule,
  ],
})
export class AppModule {}
