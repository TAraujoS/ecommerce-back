import { Request, Response, NextFunction } from "express";
import { prismaClient } from "../../";
import { signup } from "../../controllers/auth";
import { BadRequestException } from "../../exceptions/bad-requests";
import { ErrorCode } from "../../exceptions/root";
import { hashSync } from "bcrypt";
import { InternalException } from "../../exceptions/internal-exception";
import { ZodError } from "zod";

// Mock das dependências externas
jest.mock("../../index", () => ({
  prismaClient: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("bcrypt", () => ({
  hashSync: jest.fn(),
}));

describe("Signup Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Mockando Request e Response
    mockRequest = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      },
    };
    mockResponse = {
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Resetando mocks antes de cada teste
    jest.clearAllMocks();
  });

  it("should create a new user if user does not exist", async () => {
    (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);

    (prismaClient.user.create as jest.Mock).mockResolvedValue({
      id: "123",
      name: "Test User",
      email: "test@example.com",
    });

    (hashSync as jest.Mock).mockReturnValue("hashedPassword123");

    await signup(mockRequest as Request, mockResponse as Response, mockNext);

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });

    expect(prismaClient.user.create).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
      },
    });

    expect(mockResponse.json).toHaveBeenCalledWith({
      id: "123",
      name: "Test User",
      email: "test@example.com",
    });
  });

  it("should throw an error if user already exists", async () => {
    (prismaClient.user.findFirst as jest.Mock).mockResolvedValue({
      id: "123",
      email: "test@example.com",
    });

    try {
      await signup(mockRequest as Request, mockResponse as Response, mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error).toEqual(
        new BadRequestException(
          "User already exists",
          ErrorCode.USER_ALREADY_EXISTS
        )
      );
    }

    expect(prismaClient.user.create).not.toHaveBeenCalled();
  });

  it("should handle validation errors", async () => {
    mockRequest.body = {
      name: "",
      email: "invalid-email",
      password: "123",
    };

    try {
      await signup(mockRequest as Request, mockResponse as Response, mockNext);
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
    }

    expect(prismaClient.user.findFirst).not.toHaveBeenCalled();
    expect(prismaClient.user.create).not.toHaveBeenCalled();
  });
});
