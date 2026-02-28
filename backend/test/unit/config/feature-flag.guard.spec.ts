import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from '@config/feature-flag.guard';
import { FeatureFlagService } from '@config/feature-flag.service';

describe('FeatureFlagGuard', () => {
    let guard: FeatureFlagGuard;
    let reflector: Partial<Reflector>;
    let featureFlagService: Partial<FeatureFlagService>;

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        };

        featureFlagService = {
            isEnabled: jest.fn(),
        };

        guard = new FeatureFlagGuard(
            reflector as Reflector,
            featureFlagService as FeatureFlagService,
        );
    });

    const createMockContext = (): ExecutionContext => ({
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToHttp: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
    } as unknown as ExecutionContext);

    it('should allow request when no feature flag is required', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
        const context = createMockContext();

        expect(guard.canActivate(context)).toBe(true);
        expect(featureFlagService.isEnabled).not.toHaveBeenCalled();
    });

    it('should allow request when required feature is enabled', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue('confluenceIngest');
        (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);
        const context = createMockContext();

        expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when required feature is disabled', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue('confluenceIngest');
        (featureFlagService.isEnabled as jest.Mock).mockReturnValue(false);
        const context = createMockContext();

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('Feature is disabled: confluenceIngest');
    });

    it('should check the correct feature flag key', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue('agent');
        (featureFlagService.isEnabled as jest.Mock).mockReturnValue(true);
        const context = createMockContext();

        guard.canActivate(context);

        expect(featureFlagService.isEnabled).toHaveBeenCalledWith('agent');
    });

    it('should use reflector with FEATURE_FLAG_KEY metadata', () => {
        const context = createMockContext();
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

        guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
            FEATURE_FLAG_KEY,
            [context.getHandler(), context.getClass()],
        );
    });
});
