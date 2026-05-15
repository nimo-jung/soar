import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@soar.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securepassword' })
  @IsString()
  @MinLength(8)
  password: string;
}
