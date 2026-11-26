import { z } from 'zod';

export function isSafeImageUrl(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const registerSchema = z.object({
  email: z.string().trim().email('Valid email is required').max(256),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email('Valid email is required').max(256),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  roleId: z.number().int().min(1).max(2).default(2),
});

export const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  avatarUrl: z
    .string()
    .max(500)
    .refine((val) => isSafeImageUrl(val), {
      message: "AvatarUrl must be a valid https:// URL or a relative path starting with '/'.",
    })
    .optional()
    .nullable(),
  dateOfBirth: z.string().max(64).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateRoleSchema = z.object({
  roleId: z.number().int().min(1).max(2),
});

export const productSchema = z.object({
  sku: z.string().trim().min(2, 'SKU must be at least 2 characters').max(50),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(150),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().trim().min(2, 'Category must be at least 2 characters').max(80),
  price: z.number().min(0).max(999999.99),
  stock: z.number().int().min(0).max(1000000),
  imageUrl: z
    .string()
    .max(500)
    .refine((val) => isSafeImageUrl(val), {
      message: "ImageUrl must be a valid https:// URL or a relative path starting with '/'.",
    })
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProductInput = z.infer<typeof productSchema>;
