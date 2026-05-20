import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionStoreService } from '../session/session-store.service';
export declare class MasterGuard implements CanActivate {
    private readonly jwtService;
    private readonly sessionStore;
    constructor(jwtService: JwtService, sessionStore: SessionStoreService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
