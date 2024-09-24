import { Request, Response } from "express";
import { prismaClient } from "..";
import { NotFoundException } from "../exceptions/not-found";
import { ErrorCode } from "../exceptions/root";
import { OrderEventStatus } from "@prisma/client";

export const createOrder = async (req: Request, res: Response) => {
  return await prismaClient.$transaction(async (prisma) => {
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        product: true,
      },
    });

    if (cartItems.length === 0) {
      return res.json({ message: "Cart is empty" });
    }

    const price = cartItems.reduce((acc, item) => {
      return acc + +item.product.price * item.quantity;
    }, 0);

    const address = await prisma.address.findUnique({
      where: {
        id: req.user.defaultShippingAddress,
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        netAmount: price,
        address: address.formattedAddress,
        products: {
          create: cartItems.map((cart) => {
            return {
              productId: cart.productId,
              quantity: cart.quantity,
            };
          }),
        },
      },
    });

    const orderEvent = await prisma.orderEvent.create({
      data: {
        orderId: order.id,
      },
    });

    await prisma.cartItem.deleteMany({
      where: {
        userId: req.user.id,
      },
    });

    return res.json(order);
  });
};

export const listOrders = async (req: Request, res: Response) => {
  const orders = await prismaClient.order.findMany({
    where: {
      userId: req.user.id,
    },
  });

  res.json(orders);
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const order = await prismaClient.order.update({
      where: {
        id: +req.params.id,
      },
      data: {
        status: OrderEventStatus.CANCELLED,
      },
    });

    await prismaClient.orderEvent.create({
      data: {
        orderId: order.id,
        status: OrderEventStatus.CANCELLED,
      },
    });

    res.json(order);
  } catch (error) {
    throw new NotFoundException("Order not found", ErrorCode.ORDER_NOT_FOUND);
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await prismaClient.order.findUniqueOrThrow({
      where: {
        id: +req.params.id,
      },
      include: {
        products: true,
        events: true,
      },
    });

    res.json(order);
  } catch (error) {
    throw new NotFoundException("Order not found", ErrorCode.ORDER_NOT_FOUND);
  }
};
