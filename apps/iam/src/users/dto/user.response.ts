import { ApiProperty } from '@nestjs/swagger';

export class UserV1Response {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
}

export class UserV2Response {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ example: '2026-05-24T10:15:00.000Z' }) createdAt!: string;
}
