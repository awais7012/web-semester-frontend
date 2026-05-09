import type { CollectionConfig } from 'payload'
import { tenantsArrayField } from "@payloadcms/plugin-multi-tenant/fields";

import { isAdmin } from '@/lib/access';

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: "tenants",
  tenantsCollectionSlug: "tenants",
  tenantsArrayTenantFieldName: "tenant",
  arrayFieldAccess: {
    read: () => true,
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
  },
  tenantFieldAccess: {
    read: () => true,
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
  },
})

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    read: () => true,
    create: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
    update: ({ req, id }) => {
      if (isAdmin(req.user)) return true;
      return req.user?.id === id;
    }
  },
  admin: {
    useAsTitle: 'email',
    hidden: ({ user }) => !isAdmin(user),
  },
  auth: {
    cookies: {
      ...(process.env.NODE_ENV !== "development" && {
        sameSite: "None",
        domain: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
        secure: true,
      }),
    }
  },
  fields: [
    {
      name: "username",
      required: true,
      unique: true,
      type: "text",
    },
    {
      name: "roles",
      type: "select",
      defaultValue: ["user"],
      hasMany: true,
      options: ["admin", "vendor", "user"],
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "emailVerified",
      type: "checkbox",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Whether the user has verified their email address",
      },
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
    },
    {
      name: "emailVerificationToken",
      type: "text",
      admin: { hidden: true },
    },
    {
      name: "emailVerificationExpiry",
      type: "date",
      admin: { hidden: true },
    },
    {
      name: "passwordResetToken",
      type: "text",
      admin: { hidden: true },
    },
    {
      name: "passwordResetExpiry",
      type: "date",
      admin: { hidden: true },
    },
    {
      ...defaultTenantArrayField,
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: "sidebar",
      },
    },
  ],
};
