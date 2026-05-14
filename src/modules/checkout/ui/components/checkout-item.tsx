import Link from "next/link";
import Image from "next/image";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

interface CheckoutItemProps {
  isLast?: boolean;
  imageUrl?: string | null;
  name: string;
  productUrl: string;
  tenantUrl: string;
  tenantName: string;
  price: number;
  quantity: number;
  onAdd: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
}

export const CheckoutItem = ({
  isLast,
  imageUrl,
  name,
  productUrl,
  tenantUrl,
  tenantName,
  price,
  quantity,
  onAdd,
  onRemoveOne,
  onRemoveAll,
}: CheckoutItemProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-[7rem_1fr] gap-4 border-b",
        isLast && "border-b-0"
      )}
    >
      <div className="overflow-hidden border-r">
        <div className="relative aspect-square h-full">
          <Image
            src={imageUrl || "/placeholder.png"}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      </div>

      <div className="py-4 pr-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={productUrl}>
              <h4 className="font-bold underline truncate">{name}</h4>
            </Link>
            <Link href={tenantUrl}>
              <p className="text-sm text-muted-foreground underline">{tenantName}</p>
            </Link>
          </div>
          <p className="font-semibold shrink-0">{formatCurrency(price * quantity)}</p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          {/* Quantity controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRemoveOne}
              className="w-7 h-7 rounded-md border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 transition-colors"
            >
              <MinusIcon className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={onAdd}
              className="w-7 h-7 rounded-md border border-zinc-300 flex items-center justify-center hover:bg-zinc-100 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemoveAll}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Remove"
          >
            <Trash2Icon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
