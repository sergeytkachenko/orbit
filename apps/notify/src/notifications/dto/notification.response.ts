import { ApiProperty } from '@nestjs/swagger';

export class NotificationRecipientResponse {
  @ApiProperty() email!: string;
  @ApiProperty() displayName!: string;
}

export class NotificationV1Response {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() status!: string;
}

export class NotificationV2Response {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() body!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: NotificationRecipientResponse }) recipient!: NotificationRecipientResponse;
  @ApiProperty() createdAt!: string;
}
