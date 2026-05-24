import { Module } from '@nestjs/common';
import { CreateUserHandler } from './api/create-user.handler';
import { InMemoryUsersRepository, UsersRepository } from './users.repository';
import { UsersController } from './users.controller';
import { UsersGrpcController } from './users.grpc.controller';
import { UsersSeeder } from './users.seeder';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UsersGrpcController],
  providers: [
    UsersService,
    CreateUserHandler,
    UsersSeeder,
    { provide: UsersRepository, useClass: InMemoryUsersRepository },
  ],
})
export class UsersModule {}
