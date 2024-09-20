import { z } from "zod";

export const SignUpSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

export const AddressSchema = z.object({
  cep: z.string().length(8),
  city: z.string(),
  state: z.string(),
  country: z.string(),
});

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  defaultBillingAddress: z.number().optional(),
  defaultShippingAddress: z.number().optional(),
});
