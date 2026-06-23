import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateNetworkDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;
    
  @IsOptional()
  @IsNumber()
  x_pos?: number;

  @IsOptional()
  @IsNumber()
  y_pos?: number;
}
