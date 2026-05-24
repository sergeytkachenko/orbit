import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { NotificationChannel } from '../notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ example: 'a3f1e7b0-...' })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.Email })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty({ example: 'Welcome!' })
  @IsString()
  @MinLength(1)
  subject!: string;

  @ApiProperty({ example: 'Hello there.' })
  @IsString()
  @MinLength(1)
  body!: string;
}
