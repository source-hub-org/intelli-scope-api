import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseTransformInterceptor } from '../../interceptors/response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseTransformInterceptor],
    }).compile();

    interceptor = module.get<ResponseTransformInterceptor<any>>(
      ResponseTransformInterceptor,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should transform response data into standardized format', (done) => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/test',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const responseData = { id: 1, name: 'Test' };
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse).toEqual({
            success: true,
            data: responseData,
            statusCode: 200,
          });
        },
        complete: () => {
          done();
        },
      });
    });

    it('should not transform response if it already has success property', (done) => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/test',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const responseData = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation successful',
      };
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse).toEqual(responseData);
        },
        complete: () => {
          done();
        },
      });
    });

    it('should handle null or undefined response', (done) => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/test',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(null)),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse).toEqual({
            success: true,
            data: null,
            statusCode: 200,
          });
        },
        complete: () => {
          done();
        },
      });
    });

    it('should handle primitive response values', (done) => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/test',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of('Simple string response')),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse).toEqual({
            success: true,
            data: 'Simple string response',
            statusCode: 200,
          });
        },
        complete: () => {
          done();
        },
      });
    });

    it('should handle array response', (done) => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            method: 'GET',
            url: '/api/test',
          }),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
      } as unknown as ExecutionContext;

      const responseData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of(responseData)),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse).toEqual({
            success: true,
            data: responseData,
            statusCode: 200,
          });
        },
        complete: () => {
          done();
        },
      });
    });
  });
});
