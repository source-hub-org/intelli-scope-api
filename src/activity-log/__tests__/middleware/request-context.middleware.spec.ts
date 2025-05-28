import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { RequestContextMiddleware } from '../../middleware/request-context.middleware';
import { createMockClsService } from '../../../common/__tests__/test-utils';
import { Request, Response } from 'express';
import { Logger } from '@nestjs/common';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let clsService: ClsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestContextMiddleware,
        {
          provide: ClsService,
          useValue: createMockClsService(),
        },
      ],
    }).compile();

    middleware = module.get<RequestContextMiddleware>(RequestContextMiddleware);
    clsService = module.get<ClsService>(ClsService);

    // Mock Logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should store request context in CLS and call next', () => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        // Add required Express.Request properties
        get: jest.fn(),
        header: jest.fn(),
        accepts: jest.fn(),
        acceptsCharsets: jest.fn(),
        acceptsEncodings: jest.fn(),
        acceptsLanguages: jest.fn(),
        range: jest.fn(),
      } as unknown as Request;

      const mockResponse = {} as Response;
      const mockNext = jest.fn();

      const setSpy = jest.spyOn(clsService, 'set');
      jest.spyOn(clsService, 'getId').mockReturnValue('test-request-id');
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(setSpy).toHaveBeenCalledWith('request', mockRequest);
      expect(setSpy).toHaveBeenCalledWith('response', mockResponse);
      expect(setSpy).toHaveBeenCalledWith('startTime', 1234567890);
      expect(setSpy).toHaveBeenCalledWith('requestId', 'test-request-id');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and call next with error', () => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        // Add required Express.Request properties
        get: jest.fn(),
        header: jest.fn(),
        accepts: jest.fn(),
        acceptsCharsets: jest.fn(),
        acceptsEncodings: jest.fn(),
        acceptsLanguages: jest.fn(),
        range: jest.fn(),
      } as unknown as Request;

      const mockResponse = {} as Response;
      const mockNext = jest.fn();
      const error = new Error('Test error');

      const setSpy = jest.spyOn(clsService, 'set').mockImplementation(() => {
        throw error;
      });

      // Act
      middleware.use(mockRequest, mockResponse, mockNext);

      // Assert
      expect(setSpy).toHaveBeenCalledWith('request', mockRequest);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
