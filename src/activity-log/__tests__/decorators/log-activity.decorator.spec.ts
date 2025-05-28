import { Test, TestingModule } from '@nestjs/testing';
import { LogActivity } from '../../decorators/log-activity.decorator';
import { ActivityLogService } from '../../activity-log.service';

describe('LogActivity Decorator', () => {
  let activityLogService: ActivityLogService;

  const mockActivityLogService = {
    logActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    activityLogService = module.get<ActivityLogService>(ActivityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should log activity when method is called', async () => {
    // Arrange
    class TestService {
      constructor(private readonly activityLogService: ActivityLogService) {}

      @LogActivity({
        actionType: 'create',
        resourceType: 'test',
        getResourceId: (args: unknown[]): string => String(args[0]),
      })
      async createTest(
        userId: string,
        data: Record<string, unknown>,
      ): Promise<Record<string, unknown>> {
        // Using await to satisfy require-await rule
        await Promise.resolve();
        const result: Record<string, unknown> = { id: 'test-id', ...data };
        return result;
      }
    }

    const testService = new TestService(activityLogService);
    const userId = 'user-id';
    const testData = { name: 'Test' };

    // Act
    const result: Record<string, unknown> = await testService.createTest(
      userId,
      testData,
    );

    // Assert
    expect(result).toEqual({ id: 'test-id', name: 'Test' });
    const logActivitySpy = jest.spyOn(activityLogService, 'logActivity');
    expect(logActivitySpy).toHaveBeenCalledWith({
      userId,
      action: 'create',
      resource: 'test',
      details: expect.objectContaining<Record<string, unknown>>({
        args: [userId, testData],
        result: { id: 'test-id', name: 'Test' },
      }),
    });
  });

  it('should log activity with custom details function', async () => {
    // Arrange
    const detailsFunction = (
      args: unknown[],
      result: Record<string, unknown>,
    ) => {
      const data = args[1] as Record<string, unknown>;
      return {
        customField: 'custom value',
        inputName: data.name as string,
        outputId: result.id as string,
      };
    };

    class TestService {
      constructor(private readonly activityLogService: ActivityLogService) {}

      @LogActivity({
        actionType: 'update',
        resourceType: 'test',
        getResourceId: (args: unknown[]): string => String(args[0]),
        getEntitySnapshot: detailsFunction,
      })
      async updateTest(
        userId: string,
        data: Record<string, unknown>,
      ): Promise<Record<string, unknown>> {
        // Using await to satisfy require-await rule
        await Promise.resolve();
        const result: Record<string, unknown> = {
          id: 'test-id',
          ...data,
          updated: true,
        };
        return result;
      }
    }

    const testService = new TestService(activityLogService);
    const userId = 'user-id';
    const testData = { name: 'Updated Test' };

    // Act
    const result: Record<string, unknown> = await testService.updateTest(
      userId,
      testData,
    );

    // Assert
    expect(result).toEqual({
      id: 'test-id',
      name: 'Updated Test',
      updated: true,
    });
    const logActivitySpy = jest.spyOn(activityLogService, 'logActivity');
    expect(logActivitySpy).toHaveBeenCalledWith({
      userId,
      action: 'update',
      resource: 'test',
      details: expect.objectContaining<Record<string, unknown>>({
        entitySnapshot: {
          customField: 'custom value',
          inputName: 'Updated Test',
          outputId: 'test-id',
        },
      }),
    });
  });

  it('should handle errors and still log activity', async () => {
    // Arrange
    class TestService {
      constructor(private readonly activityLogService: ActivityLogService) {}

      @LogActivity({
        actionType: 'delete',
        resourceType: 'test',
        getResourceId: (args: unknown[]): string => String(args[0]),
      })
      async deleteTest(_userId: string, _id: string): Promise<void> {
        // Using await to satisfy require-await rule
        await Promise.resolve();
        throw new Error('Delete failed');
      }
    }

    const testService = new TestService(activityLogService);
    const userId = 'user-id';
    const testId = 'test-id';

    // Act & Assert
    await expect(testService.deleteTest(userId, testId)).rejects.toThrow(
      'Delete failed',
    );
    const logActivitySpy = jest.spyOn(activityLogService, 'logActivity');
    expect(logActivitySpy).toHaveBeenCalledWith({
      userId,
      action: 'delete',
      resource: 'test',
      details: expect.objectContaining<Record<string, unknown>>({
        args: [userId, testId],
        error: expect.stringContaining('Delete failed') as unknown,
      }),
    });
  });

  it('should not log activity when userId is not provided', async () => {
    // Arrange
    class TestService {
      constructor(private readonly activityLogService: ActivityLogService) {}

      @LogActivity({
        actionType: 'view',
        resourceType: 'test',
        getResourceId: (_args: unknown[]): undefined => undefined, // This will cause no logging
      })
      async viewTest(
        data: Record<string, unknown>,
      ): Promise<Record<string, unknown>> {
        // Using await to satisfy require-await rule
        await Promise.resolve();
        const result: Record<string, unknown> = { ...data, viewed: true };
        return result;
      }
    }

    const testService = new TestService(activityLogService);
    const testData = { name: 'Test' };

    // Act
    const result: Record<string, unknown> =
      await testService.viewTest(testData);

    // Assert
    expect(result).toEqual({ name: 'Test', viewed: true });
    const logActivitySpy = jest.spyOn(activityLogService, 'logActivity');
    expect(logActivitySpy).not.toHaveBeenCalled();
  });
});
