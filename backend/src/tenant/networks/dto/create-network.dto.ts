import { IsString, IsNumber } from 'class-validator';

export class CreateNetworkDto {
  @IsString()
  name!: string;

  @IsString()
  status!: string;

  @IsString()
  type!: string;

  @IsString()
  ip_address?: string;

  @IsNumber()
  x_pos!: number;

  @IsNumber()
  y_pos!: number;
}
