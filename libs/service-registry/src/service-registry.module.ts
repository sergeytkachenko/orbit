import { DynamicModule, Global, Module } from '@nestjs/common';
import { ServiceRegistry } from './service-registry';
import { ServiceName, ServiceRegistryConfig } from './types';

export interface ServiceRegistryModuleOptions {
  config?: ServiceRegistryConfig<ServiceName>;
}

/**
 * Global module so any module can `@Inject(ServiceRegistry)` without
 * importing this module in every place. There is exactly one registry
 * per service process.
 */
@Global()
@Module({})
export class ServiceRegistryModule {
  static forRoot(options: ServiceRegistryModuleOptions = {}): DynamicModule {
    const registry = options.config
      ? new ServiceRegistry((process.env.ORBIT_ENV ?? 'local') as never, options.config)
      : ServiceRegistry.fromEnv();
    return {
      module: ServiceRegistryModule,
      providers: [{ provide: ServiceRegistry, useValue: registry }],
      exports: [ServiceRegistry],
    };
  }
}
