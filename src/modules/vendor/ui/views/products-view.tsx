"use client";

import z from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArchiveIcon, ArchiveRestoreIcon, PlusIcon, PencilIcon, Trash2Icon, PackageIcon as PackageEmptyIcon } from "lucide-react";

import { vendorApi, categoriesApi, type VendorProduct, type Category } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/image-upload";
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
  price: z.coerce.number().min(1, "Price must be at least 1 PKR"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  refund_policy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]).default("30-day"),
  image_url: z.string().nullable().optional(),
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

function NewProductDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (product: VendorProduct) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      categoriesApi.list().then((res) => {
        if (res.success && res.data) setCategories(res.data);
      });
    }
  }, [open]);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, description: "", refund_policy: "30-day", image_url: null },
  });

  const onSubmit = async (values: ProductForm) => {
    setIsPending(true);
    const res = await vendorApi.createProduct({
      name: values.name,
      price: values.price,
      description: values.description ?? null,
      category_id: values.category_id ? Number(values.category_id) : null,
      refund_policy: values.refund_policy,
      image_url: values.image_url ?? null,
    });
    setIsPending(false);

    if (!res.success || !res.data) {
      toast.error(res.error ?? "Failed to create product");
      return;
    }
    toast.success("Product created!");
    form.reset();
    onCreated(res.data);
    onClose();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product image</FormLabel>
                  <FormControl>
                    <ImageUpload value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>Price (PKR) *</FormLabel>
                  <FormControl><Input {...field} type="number" min={1} step={1} placeholder="500" /></FormControl>
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
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="refund_policy"
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
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-black text-white hover:bg-pink-400 hover:text-black"
                disabled={isPending}
              >
                {isPending ? "Creating…" : "Create product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditProductDialog({
  product,
  onClose,
  onUpdated,
}: {
  product: VendorProduct | null;
  onClose: () => void;
  onUpdated: (product: VendorProduct) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      price: product?.price ?? 0,
      description: product?.description ?? "",
      category_id: product?.category_id ? String(product.category_id) : undefined,
      refund_policy: (product?.refund_policy as ProductForm["refund_policy"]) ?? "30-day",
      image_url: product?.image_url ?? null,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        price: product.price,
        description: product.description ?? "",
        category_id: product.category_id ? String(product.category_id) : undefined,
        refund_policy: (product.refund_policy as ProductForm["refund_policy"]) ?? "30-day",
        image_url: product?.image_url ?? null,
      });
      categoriesApi.list().then((res) => {
        if (res.success && res.data) setCategories(res.data);
      });
    }
  }, [product, form]);

  const onSubmit = async (values: ProductForm) => {
    if (!product) return;
    setIsPending(true);
    const res = await vendorApi.updateProduct(product.id, {
      name: values.name,
      price: values.price,
      description: values.description ?? null,
      category_id: values.category_id ? Number(values.category_id) : null,
      refund_policy: values.refund_policy,
      image_url: values.image_url ?? null,
    });
    setIsPending(false);
    if (!res.success || !res.data) {
      toast.error(res.error ?? "Failed to update product");
      return;
    }
    toast.success("Product updated!");
    onUpdated(res.data);
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <FormField control={form.control} name="image_url" render={({ field }) => (
              <FormItem>
                <FormLabel>Product image</FormLabel>
                <FormControl>
                  <ImageUpload value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Product name *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Price (PKR) *</FormLabel>
                <FormControl><Input {...field} type="number" min={1} step={1} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Short description</FormLabel>
                <FormControl><Textarea {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="refund_policy" render={({ field }) => (
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
            )} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-black text-white hover:bg-pink-400 hover:text-black" disabled={isPending}>
                {isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const ProductsView = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<VendorProduct | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeActive, setStoreActive] = useState(true);

  useEffect(() => {
    vendorApi.products().then((res) => {
      if (res.success && res.data) setProducts(res.data);
      setIsLoading(false);
    });
    vendorApi.store().then((res) => {
      if (res.success && res.data) {
        setStoreActive(res.data.tenant.stripe_details_submitted);
      }
    });
  }, []);

  const handleDelete = async (product: VendorProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const res = await vendorApi.deleteProduct(product.id);
    if (!res.success) {
      toast.error(res.error ?? "Failed to delete product");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    toast.success("Product deleted");
  };

  const handleToggleArchive = async (product: VendorProduct) => {
    const res = await vendorApi.toggleArchive(product.id);
    if (!res.success) {
      toast.error(res.error ?? "Failed to update product");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_archived: !p.is_archived } : p
      )
    );
    toast.success("Product updated");
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <NewProductDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(p) => setProducts((prev) => [p, ...prev])}
      />
      <EditProductDialog
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onUpdated={(p) => setProducts((prev) => prev.map((x) => x.id === p.id ? p : x))}
      />

      {!storeActive && !isLoading && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-amber-700 font-medium text-sm">
            Your store is not active yet.{" "}
            <a href="/vendor/settings" className="underline font-semibold">Go to Settings</a>{" "}
            to activate it before creating products.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">Products</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {products.length} listing{products.length !== 1 ? "s" : ""} &middot;{" "}
            {products.filter((p) => !p.is_archived).length} active
          </p>
        </div>
        <Button
          onClick={() => {
            if (!storeActive) { toast.error("Activate your store in Settings first."); return; }
            setDialogOpen(true);
          }}
          className="bg-black text-white hover:bg-pink-400 hover:text-black rounded-xl gap-2 transition-colors"
        >
          <PlusIcon className="size-4" />
          New product
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <PackageEmptyIcon className="size-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold text-zinc-600">No products yet</p>
          <p className="text-sm mt-1">Click &ldquo;New product&rdquo; to create your first listing.</p>
        </div>
      )}

      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className={`group bg-white rounded-2xl border transition-all duration-200 p-4 flex items-center gap-4 hover:shadow-md hover:border-zinc-200 ${
              product.is_archived ? "border-zinc-100 opacity-60" : "border-zinc-100"
            }`}
          >
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
              <Image
                src={product.image_url ?? "/placeholder.png"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-zinc-900 truncate ${product.is_archived ? "line-through text-zinc-400" : ""}`}>
                {product.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-semibold text-zinc-700">{formatCurrency(product.price)}</span>
                {product.category_name && (
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{product.category_name}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                product.is_archived ? "bg-zinc-100 text-zinc-500" : "bg-emerald-50 text-emerald-700"
              }`}>
                {product.is_archived ? "Archived" : "Active"}
              </span>
              <button
                onClick={() => setEditProduct(product)}
                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors"
                title="Edit"
              >
                <PencilIcon className="size-3.5" />
              </button>
              <button
                onClick={() => handleToggleArchive(product)}
                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors"
                title={product.is_archived ? "Unarchive" : "Archive"}
              >
                {product.is_archived ? <ArchiveRestoreIcon className="size-3.5" /> : <ArchiveIcon className="size-3.5" />}
              </button>
              <button
                onClick={() => handleDelete(product)}
                className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
