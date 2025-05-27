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
        getResourceId: (args) => args[0],
      })
      async createTest(userId: string, data: any): Promise<any> {
        return { id: 'test-id', ...data };
      }
    }

    const testService = new TestService(activityLogService);
    const userId = 'user-id';
    const testData = { name: 'Test' };

    // Act
    const result = await testService.createTest(userId, testData);

    // Assert
    expect(result).toEqual({ id: 'test-id', name: 'Test' });
    expect(activityLogService.logActivity).toHaveBeenCalledWith({
      userId,
      action: 'create',
      resource: 'test',
      details: expect.objectContaining({
        args: [userId, testData],
        result: { id: 'test-id', name: 'Test' },
      }),
    });
  });

  it('should log activity with custom details function', async () => {
    // Arrange
    const detailsFunction = (args: any[], result: any) => ({
      customField: 'custom value',
      inputName: args[1].name,
      outputId: result.id,
    });

    class TestService {
      constructor(private readonly activityLogService: ActivityLogService) {}

      @LogActivity({
        actionType: 'update',
        resourceType: 'test',
        getResourceId: (args) => args[0],
        getEntitySnapshot: detailsFunction,
      })
      async updateTest(userId: string, data: any): Promise<any> {
        return { id: 'test-id', ...data, updated: true };
      }
    }

    const testService = new TestService(activityLogService);
    const userId = 'user-id';
    const testData = { name: 'Updated Test' };

    // Act
    const result = await testService.updateTest(userId, testData);

    // Assert
    expect(result).toEqual({
      id: 'test-id',
      name: 'Updated Test',
      updated: true,
    });
    expect(activityLogService.logActivity).toHaveBeenCalledWith({
      userId,
      action: 'update',
      resource: 'test',
      details: expect.objectContaining({
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
        getResourceId: (args) => args[0],
      })
      async deleteTest(userId: string, id: string): Promise<void> {
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
    expect(activityLogService.logActivity).toHaveBeenCalledWith({
      userId,
      action: 'delete',
      resource: 'test',
      details: expect.objectContaining({
        args: [userId, testId],
        error: expect.stringContaining('Delete failed'),
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
        getResourceId: (args) => undefined, // This will cause no logging
      })
      async viewTest(data: any): Promise<any> {
        return { ...data, viewed: true };
      }
    }

    const testService = new TestService(activityLogService);
    const testData = { name: 'Test' };

    // Act
    const result = await testService.viewTest(testData);

    // Assert
    expect(result).toEqual({ name: 'Test', viewed: true });
    expect(activityLogService.logActivity).not.toHaveBeenCalled();
  });
});
