import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService, FeatureFlag } from './feature-flag.service';

export const FEATURE_FLAG_KEY = 'requiredFeature';

/**
 * Decorator to mark a controller method as requiring a specific feature flag.
 * If the flag is disabled, the guard returns 403 Forbidden.
 *
 * @example
 * ```typescript
 * @RequireFeature('confluenceIngest')
 * @Post('confluence')
 * async ingestConfluence() { ... }
 * ```
 */
export const RequireFeature = (flag: FeatureFlag) =>
    SetMetadata(FEATURE_FLAG_KEY, flag);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly featureFlagService: FeatureFlagService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredFlag = this.reflector.getAllAndOverride<FeatureFlag | undefined>(
            FEATURE_FLAG_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredFlag) {
            return true;
        }

        const isEnabled = this.featureFlagService.isEnabled(requiredFlag);

        if (!isEnabled) {
            throw new ForbiddenException(`Feature is disabled: ${requiredFlag}`);
        }

        return true;
    }
}
