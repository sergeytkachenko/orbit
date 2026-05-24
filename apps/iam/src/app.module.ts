import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule, SharedLoggerModule, zodEnvValidator } from '@orbit/common';
import { ServiceRegistryModule } from '@orbit/service-registry';
import { IamEnvSchema } from './config/env.schema';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: zodEnvValidator(IamEnvSchema) }),
    SharedLoggerModule,
    ServiceRegistryModule.forRoot(),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
