import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
export declare class MasterGuard implements CanActivate {
    private readonly jwtService;
    private readonly dataSource;
    constructor(jwtService: JwtService, dataSource: DataSource);
    private assertActiveSession;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
