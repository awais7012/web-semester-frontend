import type { CollectionConfig } from 'payload';

import { isAdmin } from '@/lib/access';

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  admin: {
    useAsTitle: 'slug',
    hidden: ({ user }) => !isAdmin(user),
  },
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
      label: "Store Name",
      admin: {
        description: "This is the name of the store (e.g. Antonio's Store)",
      },
    },
    {
      name: "slug",
      type: "text",
      index: true,
      required: true,
      unique: true,
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        description: "This is the subdomain for the store (e.g. [slug].funroad.com)",
      },
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "stripeAccountId",
      type: "text",
      required: true,
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        description: "Stripe Account ID associated with your shop",
      },
    },
    {
      name: "stripeDetailsSubmitted",
      type: "checkbox",
      access: {
        update: ({ req }) => isAdmin(req.user),
      },
      admin: {
        description: "You cannot create products until you submit your Stripe details",
      },
    },
  ],
};
