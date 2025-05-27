import { NotFoundException } from '@nestjs/common';
import { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';
import {
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/pagination.interface';
import { PaginationUtils } from '../utils/pagination.util';

/**
 * Base CRUD service for MongoDB models
 * @template T Document type
 * @template CreateDto Create DTO type
 * @template UpdateDto Update DTO type
 */
export abstract class BaseCrudService<
  T extends Document,
  CreateDto,
  UpdateDto,
> {
  /**
   * Constructor
   * @param model Mongoose model
   */
  constructor(protected readonly model: Model<T>) {}

  /**
   * Create a new document
   * @param createDto Create DTO
   * @returns Created document
   */
  async create(createDto: CreateDto): Promise<T> {
    const createdEntity = new this.model(createDto);
    return createdEntity.save();
  }

  /**
   * Find all documents with pagination
   * @param filter Filter query
   * @param options Pagination options
   * @returns Paginated result
   */
  async findAll(
    filter: FilterQuery<T> = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return PaginationUtils.createPaginatedResult(data, total, options);
  }

  /**
   * Find a document by ID
   * @param id Document ID
   * @returns Document or null if not found
   */
  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find a document by ID or throw an exception if not found
   * @param id Document ID
   * @returns Document
   * @throws NotFoundException if document not found
   */
  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Find one document by filter
   * @param filter Filter query
   * @returns Document or null if not found
   */
  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  /**
   * Update a document by ID
   * @param id Document ID
   * @param updateDto Update DTO
   * @returns Updated document or null if not found
   */
  async update(id: string, updateDto: UpdateDto): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, updateDto as UpdateQuery<T>, { new: true })
      .exec();
  }

  /**
   * Update a document by ID or throw an exception if not found
   * @param id Document ID
   * @param updateDto Update DTO
   * @returns Updated document
   * @throws NotFoundException if document not found
   */
  async updateOrFail(id: string, updateDto: UpdateDto): Promise<T> {
    const updatedEntity = await this.update(id, updateDto);
    if (!updatedEntity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return updatedEntity;
  }

  /**
   * Remove a document by ID
   * @param id Document ID
   * @returns Removed document or null if not found
   */
  async remove(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  /**
   * Remove a document by ID or throw an exception if not found
   * @param id Document ID
   * @returns Removed document
   * @throws NotFoundException if document not found
   */
  async removeOrFail(id: string): Promise<T> {
    const removedEntity = await this.remove(id);
    if (!removedEntity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return removedEntity;
  }
}
