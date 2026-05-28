import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class TestSmtpMailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  to: string;
}
