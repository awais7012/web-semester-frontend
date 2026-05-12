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
      ...(process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true" && {
        // Strip port — cookie domain does not accept ports
        domain: (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").split(":")[0],
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        ...(process.env.NODE_ENV === "production" && { secure: true }),
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
      name: "status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Pending Approval", value: "pending" },
        { label: "Blocked", value: "blocked" },
      ],
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        position: "sidebar",
        description: "Vendors must be approved before accessing their dashboard. Blocked users cannot log in.",
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
