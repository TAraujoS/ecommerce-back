import { Request, Response } from "express";
import { ChangeQuantitySchema, CreateCartSchema } from "../schema/cart";
import { NotFoundException } from "../exceptions/not-found";
import { ErrorCode } from "../exceptions/root";
import { Product } from "@prisma/client";
import { prismaClient } from "..";
import { BadRequestException } from "../exceptions/bad-requests";

export const addItemToCart = async (req: Request, res: Response) => {
  const validatedData = CreateCartSchema.parse(req.body);
  let product: Product;

  try {
    product = await prismaClient.product.findUniqueOrThrow({
      where: {
        id: validatedData.productId,
      },
    });
  } catch (error) {
    throw new NotFoundException(
      "Product not found",
      ErrorCode.PRODUCT_NOT_FOUND
    );
  }

  let cartItem = await prismaClient.cartItem.findFirst({
    where: {
      userId: req.user.id,
      productId: product.id,
    },
  });

  if (cartItem) {
    cartItem = await prismaClient.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity: {
          increment: validatedData.quantity,
        },
      },
    });
  } else {
    cartItem = await prismaClient.cartItem.create({
      data: {
        userId: req.user.id,
        productId: product.id,
        quantity: validatedData.quantity,
      },
    });
  }

  res.json(cartItem);
};

export const deleteItemFromCart = async (req: Request, res: Response) => {
  const cartItem = await prismaClient.cartItem.findUniqueOrThrow({
    where: {
      id: +req.params.id,
    },
  });

  if (cartItem.userId !== req.user.id) {
    throw new BadRequestException(
      "Cart item does not belong to user",
      ErrorCode.CART_ITEM_NOT_BELONG_TO_USER
    );
  }

  try {
    await prismaClient.cartItem.delete({
      where: {
        id: +req.params.id,
      },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    throw new NotFoundException(
      "Cart item not found",
      ErrorCode.CART_ITEM_NOT_FOUND
    );
  }
};

export const changeQuantity = async (req: Request, res: Response) => {
  const validatedData = ChangeQuantitySchema.parse(req.body);

  const cartItem = await prismaClient.cartItem.findUniqueOrThrow({
    where: {
      id: +req.params.id,
    },
  });

  if (cartItem.userId !== req.user.id) {
    throw new BadRequestException(
      "Cart item does not belong to user",
      ErrorCode.CART_ITEM_NOT_BELONG_TO_USER
    );
  }

  const updatedCart = await prismaClient.cartItem.update({
    where: {
      id: +req.params.id,
    },
    data: {
      quantity: validatedData.quantity,
    },
  });

  res.json(updatedCart);
};

export const getCart = async (req: Request, res: Response) => {
  const cart = await prismaClient.cartItem.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      product: true,
    },
  });

  res.json(cart);
};
