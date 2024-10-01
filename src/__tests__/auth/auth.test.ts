import { Request, Response, NextFunction } from "express";
import { prismaClient } from "../../";
import { login, signup } from "../../controllers/auth";
import { BadRequestException } from "../../exceptions/bad-requests";
import { ErrorCode } from "../../exceptions/root";
import { compareSync, hashSync } from "bcrypt";
import { ZodError } from "zod";
import * as jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../secrets";
import { NotFoundException } from "../../exceptions/not-found";

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
  compareSync: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

describe("Auth Controller - Signup", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
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

describe("Auth Controller - Login", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    mockResponse = {
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should authenticate the user successfully", async () => {
    const mockUser = {
      id: "123",
      email: "test@example.com",
      password: hashSync("password123", 10),
    };

    (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue("mockToken");

    (compareSync as jest.Mock).mockReturnValue(true);

    await login(mockRequest as Request, mockResponse as Response);

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });

    expect(compareSync).toHaveBeenCalledWith("password123", mockUser.password);

    expect(jwt.sign).toHaveBeenCalledWith({ userId: "123" }, JWT_SECRET);

    expect(mockResponse.json).toHaveBeenCalledWith({
      user: mockUser,
      token: "mockToken",
    });
  });

  it("should throw an error if the password is incorrect", async () => {
    mockRequest.body = {
      email: "test@example.com",
      password: "wrongpassword",
    };

    const mockUser = {
      id: "123",
      email: "test@example.com",
      password: hashSync("validpassword", 10),
    };

    (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

    (compareSync as jest.Mock).mockReturnValue(false);

    await expect(
      login(mockRequest as Request, mockResponse as Response)
    ).rejects.toThrow(
      new BadRequestException(
        "Incorrect password",
        ErrorCode.INCORRECT_PASSWORD
      )
    );

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });

    expect(compareSync).toHaveBeenCalledWith(
      "wrongpassword",
      mockUser.password
    );

    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it("should throw an error if user is not found", async () => {
    mockRequest.body = {
      email: "nonexistent@example.com",
      password: "password",
    };

    (prismaClient.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      login(mockRequest as Request, mockResponse as Response)
    ).rejects.toThrow(
      new NotFoundException("User not found", ErrorCode.USER_NOT_FOUND)
    );

    expect(prismaClient.user.findFirst).toHaveBeenCalledWith({
      where: { email: "nonexistent@example.com" },
    });
  });
});
