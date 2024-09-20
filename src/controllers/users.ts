import { Request, Response } from "express";
import { prismaClient } from "..";
import { AddressSchema, UpdateUserSchema } from "../schema/users";
import { ErrorCode } from "../exceptions/root";
import { NotFoundException } from "../exceptions/not-found";
import { Address } from "@prisma/client";
import { BadRequestException } from "../exceptions/bad-requests";

export const addAddress = async (req: Request, res: Response) => {
  AddressSchema.parse(req.body);

  const address = await prismaClient.address.create({
    data: {
      ...req.body,
      userId: req.user.id,
    },
  });

  res.json(address);
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    await prismaClient.address.delete({
      where: {
        id: +req.params.id,
      },
    });

    res.json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    throw new NotFoundException(
      "Address not found",
      ErrorCode.ADDRESS_NOT_FOUND
    );
  }
};

export const listAddress = async (req: Request, res: Response) => {
  const addresses = await prismaClient.address.findMany({
    where: {
      userId: req.user.id,
    },
  });

  res.json(addresses);
};

export const updateUser = async (req: Request, res: Response) => {
  console.log("UPDATE");
  const validatedData = UpdateUserSchema.parse(req.body);
  let billingAddress: Address;
  let shippingAddress: Address;

  if (validatedData.defaultBillingAddress) {
    try {
      billingAddress = await prismaClient.address.findUniqueOrThrow({
        where: {
          id: validatedData.defaultBillingAddress,
        },
      });
    } catch (error) {
      throw new NotFoundException(
        "Address not found",
        ErrorCode.ADDRESS_NOT_FOUND
      );
    }

    if (billingAddress.userId !== req.user.id) {
      throw new BadRequestException(
        "Address not belong to user",
        ErrorCode.ADDRESS_DOES_NOT_BELONG_TO_USER
      );
    }
  }

  if (validatedData.defaultShippingAddress) {
    try {
      shippingAddress = await prismaClient.address.findUniqueOrThrow({
        where: {
          id: validatedData.defaultShippingAddress,
        },
      });
    } catch (error) {
      throw new NotFoundException(
        "Address not found",
        ErrorCode.ADDRESS_NOT_FOUND
      );
    }

    if (shippingAddress.userId !== req.user.id) {
      throw new BadRequestException(
        "Address not belong to user",
        ErrorCode.ADDRESS_DOES_NOT_BELONG_TO_USER
      );
    }
  }

  const updatedUser = await prismaClient.user.update({
    where: {
      id: req.user.id,
    },
    data: validatedData,
  });

  res.json(updatedUser);
};
