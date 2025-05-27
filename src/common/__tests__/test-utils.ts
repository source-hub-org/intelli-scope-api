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
export function createMockModel(mockData: any = {}) {
  const mockModel = function () {
    this.data = mockData;
    this.save = jest.fn().mockResolvedValue(mockData);
  };

  mockModel.prototype = {
    save: jest.fn().mockResolvedValue(mockData),
  };

  mockModel.new = jest.fn().mockImplementation(() => new mockModel());
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
    t: jest.fn().mockImplementation((key: string, options?: any) => {
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
    t: jest.fn().mockImplementation((key: string, options?: any) => {
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
export function createMockConfigService(
  configValues: Record<string, any> = {},
) {
  return {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      return key in configValues ? configValues[key] : defaultValue;
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
  const store: Record<string, any> = {};

  return {
    get: jest.fn().mockImplementation((key: string) => store[key]),
    set: jest.fn().mockImplementation((key: string, value: any) => {
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
export function createMockRequest(overrides: Record<string, any> = {}) {
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
  const res: any = {};

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
export function createMockDocument(data: any) {
  return {
    ...data,
    toObject: jest.fn().mockReturnValue(data),
    toJSON: jest.fn().mockReturnValue(data),
  };
}
