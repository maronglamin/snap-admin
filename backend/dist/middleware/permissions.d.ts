import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
export declare const requirePermission: (entityType: string, permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireAnyPermission: (permissions: Array<{
    entityType: string;
    permission: string;
}>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireAllPermissions: (permissions: Array<{
    entityType: string;
    permission: string;
}>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=permissions.d.ts.map