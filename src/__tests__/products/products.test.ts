import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { prismaClient } from '../..';

import { BadRequestException } from '@/exceptions/bad-requests';
import { ErrorCode } from '@/exceptions/root';
import { NotFoundException } from '@/exceptions/not-found';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  searchProducts,
  updateProduct,
} from '@/controllers/products';

jest.mock('../../index', () => ({
  prismaClient: {
    product: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  },
}));

describe('Product Controller - createProduct', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {
        name: 'Test Product',
        price: 100,
        tags: ['tag1', 'tag2'],
      },
    };
    mockResponse = {
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should create a product successfully', async () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      price: 100,
      tags: 'tag1,tag2',
    };

    (prismaClient.product.create as jest.Mock).mockResolvedValue(mockProduct);

    await createProduct(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Test Product',
        price: 100,
        tags: 'tag1,tag2',
      },
    });

    expect(mockResponse.json).toHaveBeenCalledWith(mockProduct);
  });
});

describe('Product Controller - updateProduct', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: { id: '1' },
      body: {
        name: 'Updated Product',
        price: 150,
        tags: ['newTag1', 'newTag2'],
      },
    };
    mockResponse = {
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('should update a product successfully', async () => {
    const mockUpdatedProduct = {
      id: 1,
      name: 'Updated Product',
      price: 150,
      tags: 'newTag1,newTag2',
    };

    (prismaClient.product.update as jest.Mock).mockResolvedValue(
      mockUpdatedProduct,
    );

    await updateProduct(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: 'Updated Product',
        price: 150,
        tags: 'newTag1,newTag2',
      },
    });

    expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedProduct);
  });

  it('should throw a NotFoundException if the product is not found', async () => {
    (prismaClient.product.update as jest.Mock).mockRejectedValue(
      new NotFoundException('Product not found', ErrorCode.PRODUCT_NOT_FOUND),
    );

    await expect(
      updateProduct(mockRequest as Request, mockResponse as Response),
    ).rejects.toThrow(
      new NotFoundException('Product not found', ErrorCode.PRODUCT_NOT_FOUND),
    );
  });
});

describe('Product Controller - deleteProduct', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {
        id: '1',
      },
    };
    mockResponse = {
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should delete a product successfully', async () => {
    const mockDeletedProduct = {
      id: 1,
      name: 'Deleted Product',
      price: 100,
      tags: 'tag1,tag2',
    };

    (prismaClient.product.delete as jest.Mock).mockResolvedValue(
      mockDeletedProduct,
    );

    await deleteProduct(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(mockResponse.json).toHaveBeenCalledWith(mockDeletedProduct);
  });

  it('should throw a NotFoundException if the product does not exist', async () => {
    (prismaClient.product.delete as jest.Mock).mockRejectedValue(
      new NotFoundException('Product not found', ErrorCode.PRODUCT_NOT_FOUND),
    );

    await expect(
      deleteProduct(mockRequest as Request, mockResponse as Response),
    ).rejects.toThrow(NotFoundException);

    expect(prismaClient.product.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe('Product Controller - listProducts', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      query: {
        skip: '0',
      },
    };
    mockResponse = {
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should list products with pagination', async () => {
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 100, tags: 'tag1,tag2' },
      { id: 2, name: 'Product 2', price: 200, tags: 'tag3,tag4' },
    ];
    const mockCount = 2;

    (prismaClient.product.findMany as jest.Mock).mockResolvedValue(
      mockProducts,
    );
    (prismaClient.product.count as jest.Mock).mockResolvedValue(mockCount);

    await listProducts(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 5,
    });
    expect(prismaClient.product.count).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith({
      count: mockCount,
      data: mockProducts,
    });
  });

  it('should handle the skip query parameter', async () => {
    mockRequest.query.skip = '5';

    const mockProducts = [
      { id: 3, name: 'Product 3', price: 300, tags: 'tag5' },
    ];
    (prismaClient.product.findMany as jest.Mock).mockResolvedValue(
      mockProducts,
    );

    await listProducts(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.findMany).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
    });
  });
});

describe('Product Controller - getProductById', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {
        id: '1',
      },
    };
    mockResponse = {
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should return a product by ID successfully', async () => {
    const mockProduct = {
      id: 1,
      name: 'Test Product',
      price: 100,
      tags: 'tag1,tag2',
    };

    (prismaClient.product.findUniqueOrThrow as jest.Mock).mockResolvedValue(
      mockProduct,
    );

    await getProductById(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(mockResponse.json).toHaveBeenCalledWith(mockProduct);
  });

  it('should throw a NotFoundException if the product is not found', async () => {
    (prismaClient.product.findUniqueOrThrow as jest.Mock).mockRejectedValue(
      new NotFoundException('Product not found', ErrorCode.PRODUCT_NOT_FOUND),
    );

    await expect(
      getProductById(mockRequest as Request, mockResponse as Response),
    ).rejects.toThrow(NotFoundException);

    expect(prismaClient.product.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});

describe('Product Controller - searchProducts', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      query: {
        q: 'test',
        skip: '0',
      },
    };
    mockResponse = {
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should search products by name, description, and tags', async () => {
    const mockProducts = [
      {
        id: 1,
        name: 'Test Product 1',
        description: 'Desc 1',
        tags: 'tag1,tag2',
      },
      {
        id: 2,
        name: 'Test Product 2',
        description: 'Desc 2',
        tags: 'tag3,tag4',
      },
    ];

    (prismaClient.product.findMany as jest.Mock).mockResolvedValue(
      mockProducts,
    );

    await searchProducts(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.findMany).toHaveBeenCalledWith({
      where: {
        name: { search: 'test' },
        description: { search: 'test' },
        tags: { search: 'test' },
      },
      skip: 0,
      take: 5,
    });
    expect(mockResponse.json).toHaveBeenCalledWith(mockProducts);
  });

  it('should handle the skip query parameter', async () => {
    mockRequest.query.skip = '5';

    const mockProducts = [
      { id: 3, name: 'Test Product 3', description: 'Desc 3', tags: 'tag5' },
    ];
    (prismaClient.product.findMany as jest.Mock).mockResolvedValue(
      mockProducts,
    );

    await searchProducts(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.product.findMany).toHaveBeenCalledWith({
      where: {
        name: { search: 'test' },
        description: { search: 'test' },
        tags: { search: 'test' },
      },
      skip: 5,
      take: 5,
    });
  });
});
