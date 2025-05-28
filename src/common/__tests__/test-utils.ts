import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

/**
 * Creates a testing module with the provided metadata
 * @param metadata Module metadata
 * @returns TestingModule
 */
export async function createTestingModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  return Test.createTestingModule(metadata).compile();
}

/**
 * Creates a mock for Mongoose Model
 * @param mockData Mock data to be returned by the model methods
 * @returns Mocked Mongoose Model
 */
export function createMockModel<T = unknown>(mockData: T = {} as T) {
  // Define a type for the mock model to avoid 'any' returns
  type MockMongooseModel = {
    [key: string]: any;
    new: jest.Mock;
    constructor: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    countDocuments: jest.Mock;
    populate: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
    sort: jest.Mock;
    exec: jest.Mock;
    prototype: { save: jest.Mock };
  };

  // Define a type for the constructor function context
  interface MockModelInstance {
    data: T;
    save: jest.Mock;
  }

  const mockModel = function (this: MockModelInstance) {
    this.data = mockData;
    this.save = jest.fn().mockResolvedValue(mockData);
  } as unknown as MockMongooseModel;

  mockModel.prototype = {
    save: jest.fn().mockResolvedValue(mockData),
  };

  // Create a safe constructor function that returns a properly typed instance
  mockModel.new = jest.fn().mockImplementation((): T => {
    // We need to use type assertions here because we're dealing with a complex mock structure
    // This is a deliberate workaround for testing purposes
    return {
      data: mockData,
      save: jest.fn().mockResolvedValue(mockData),
    } as unknown as T;
  });
  mockModel.constructor = jest.fn().mockResolvedValue(mockData);
  mockModel.find = jest.fn().mockReturnValue({
    exec: jest
      .fn()
      .mockResolvedValue(Array.isArray(mockData) ? mockData : [mockData]),
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  });
  mockModel.findOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockData),
    select: jest.fn().mockReturnThis(),
  });
  mockModel.findById = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockData),
    select: jest.fn().mockReturnThis(),
  });
  mockModel.findByIdAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockData),
    select: jest.fn().mockReturnThis(),
  });
  mockModel.findByIdAndDelete = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(mockData),
  });
  mockModel.save = jest.fn().mockResolvedValue(mockData);
  mockModel.create = jest.fn().mockResolvedValue(mockData);
  mockModel.countDocuments = jest.fn().mockReturnValue({
    exec: jest
      .fn()
      .mockResolvedValue(Array.isArray(mockData) ? mockData.length : 1),
  });
  mockModel.populate = jest.fn().mockReturnThis();
  mockModel.skip = jest.fn().mockReturnThis();
  mockModel.limit = jest.fn().mockReturnThis();
  mockModel.sort = jest.fn().mockReturnThis();
  mockModel.exec = jest.fn().mockResolvedValue(mockData);

  return mockModel;
}

/**
 * Creates a mock for I18nService
 * @returns Mocked I18nService
 */
export function createMockI18nService() {
  return {
    t: jest
      .fn()
      .mockImplementation((key: string, _options?: Record<string, unknown>) => {
        // Return the key as the translation for simplicity in tests
        return `translated:${key}`;
      }),
  };
}

/**
 * Creates a mock for I18nContext
 * @returns Mocked I18nContext
 */
export function createMockI18nContext() {
  return {
    t: jest
      .fn()
      .mockImplementation((key: string, _options?: Record<string, unknown>) => {
        // Return the key as the translation for simplicity in tests
        return `translated:${key}`;
      }),
    lang: 'en',
    current: jest.fn().mockReturnValue({ lang: 'en' }),
  };
}

/**
 * Creates a mock for ConfigService
 * @param configValues Configuration values to be returned
 * @returns Mocked ConfigService
 */
export function createMockConfigService<T = Record<string, unknown>>(
  configValues: T = {} as T,
) {
  return {
    get: jest
      .fn()
      .mockImplementation((key: string, defaultValue?: unknown): unknown => {
        return key in (configValues as Record<string, unknown>)
          ? (configValues as Record<string, unknown>)[key]
          : defaultValue;
      }),
  };
}

/**
 * Creates a mock for JwtService
 * @returns Mocked JwtService
 */
export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
    verify: jest
      .fn()
      .mockReturnValue({ sub: 'userId', username: 'test@example.com' }),
    decode: jest
      .fn()
      .mockReturnValue({ sub: 'userId', username: 'test@example.com' }),
  };
}

/**
 * Creates a mock for ClsService
 * @returns Mocked ClsService
 */
export function createMockClsService() {
  const store: Record<string, unknown> = {};

  return {
    get: jest.fn().mockImplementation((key: string): unknown => store[key]),
    set: jest.fn().mockImplementation((key: string, value: unknown) => {
      store[key] = value;
    }),
    getId: jest.fn().mockReturnValue('mock-request-id'),
  };
}

/**
 * Creates a mock for Request object
 * @param overrides Properties to override in the mock request
 * @returns Mocked Request object
 */
export function createMockRequest(overrides: Record<string, unknown> = {}) {
  const req = {
    url: '/api/test',
    method: 'GET',
    headers: {},
    query: {},
    params: {},
    body: {},
    ip: '127.0.0.1',
    user: { userId: 'user-id', email: 'test@example.com' },
    ...overrides,
  };

  return req;
}

/**
 * Creates a mock for Response object
 * @returns Mocked Response object
 */
export function createMockResponse() {
  type MockResponse = {
    status: jest.Mock;
    json: jest.Mock;
    send: jest.Mock;
    [key: string]: unknown;
  };

  const res = {} as MockResponse;

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);

  return res;
}

/**
 * Creates a mock document with Mongoose document methods
 * @param data Document data
 * @returns Mocked document
 */
export function createMockDocument<T = unknown>(data: T) {
  type MockDocument<D> = D & {
    toObject: jest.Mock;
    toJSON: jest.Mock;
  };

  return {
    ...data,
    toObject: jest.fn().mockReturnValue(data),
    toJSON: jest.fn().mockReturnValue(data),
  } as MockDocument<T>;
}
