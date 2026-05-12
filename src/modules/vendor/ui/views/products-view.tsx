"use client";

import z from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArchiveIcon, ArchiveRestoreIcon, PlusIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).default("30-day"),
});

type ProductForm = z.infer<typeof productSchema>;

const REFUND_OPTIONS = [
  { value: "30-day", label: "30-day refund" },
  { value: "14-day", label: "14-day refund" },
  { value: "7-day", label: "7-day refund" },
  { value: "3-day", label: "3-day refund" },
  { value: "1-day", label: "1-day refund" },
  { value: "no-refunds", label: "No refunds" },
];

function NewProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const categories = useQuery(trpc.categories.getMany.queryOptions());
  const store = useQuery(trpc.vendor.getStore.queryOptions());
  const isVerified = store.data?.tenant?.stripeDetailsSubmitted ?? false;

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, description: "", refundPolicy: "30-day" },
  });

  const create = useMutation(
    trpc.vendor.createProduct.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.vendor.getProducts.queryFilter());
        queryClient.invalidateQueries(trpc.vendor.getStats.queryFilter());
        toast.success("Product created!");
        form.reset();
        onClose();
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const onSubmit = (values: ProductForm) => {
    create.mutate({
      name: values.name,
      price: values.price,
      description: values.description,
      categoryId: values.categoryId || undefined,
      refundPolicy: values.refundPolicy,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>

        {!isVerified && !store.isLoading && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
            You must complete Stripe verification in{" "}
            <a href="/vendor/settings" className="underline font-semibold">Settings</a>{" "}
            before creating products.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product name *</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Ultimate Productivity Guide" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (USD) *</FormLabel>
                  <FormControl><Input {...field} type="number" min={0} step={0.01} placeholder="0.00" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What does your product include?" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.data?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refundPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund policy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REFUND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-pink-400 hover:text-black"
                disabled={create.isPending || !isVerified}
              >
                {create.isPending ? "Creating…" : "Create product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const ProductsView = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const products = useQuery(trpc.vendor.getProducts.queryOptions({}));

  const toggleArchive = useMutation(
    trpc.vendor.toggleArchive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.vendor.getProducts.queryFilter());
        queryClient.invalidateQueries(trpc.vendor.getStats.queryFilter());
        toast.success("Product updated");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <NewProductDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product listings.</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-black text-white hover:bg-pink-400 hover:text-black"
        >
          <PlusIcon className="size-4 mr-2" />
          New product
        </Button>
      </div>

      {products.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!products.isLoading && products.data?.docs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">No products yet.</p>
          <p className="text-sm mt-1">Click &ldquo;New product&rdquo; to create your first listing.</p>
        </div>
      )}

      <div className="space-y-3">
        {products.data?.docs.map((product) => (
          <div
            key={product.id}
            className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="relative size-14 rounded-lg overflow-hidden border bg-gray-100 shrink-0">
              <Image
                src={(product.image as { url?: string } | null)?.url ?? "/placeholder.png"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${product.isArchived ? "line-through text-gray-400" : ""}`}>
                {product.name}
              </p>
              <p className="text-sm text-gray-500">${product.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {product.isArchived ? (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Archived</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toggleArchive.mutate({ productId: product.id, archived: !product.isArchived })
                }
                disabled={toggleArchive.isPending}
                title={product.isArchived ? "Unarchive" : "Archive"}
              >
                {product.isArchived ? (
                  <ArchiveRestoreIcon className="size-4" />
                ) : (
                  <ArchiveIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
