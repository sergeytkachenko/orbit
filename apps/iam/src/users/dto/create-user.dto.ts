import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}
