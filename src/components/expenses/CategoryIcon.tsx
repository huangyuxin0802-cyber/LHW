import {
  Car,
  Gamepad2,
  MoreHorizontal,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/types/expense";

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  餐饮: Utensils,
  交通: Car,
  购物: ShoppingBag,
  娱乐: Gamepad2,
  杂项: MoreHorizontal,
};

export function CategoryIcon({
  category,
  size = 18,
  className,
}: {
  category: string;
  size?: number;
  className?: string;
}) {
  const Icon =
    CATEGORY_ICONS[category as ExpenseCategory] ?? MoreHorizontal;
  return <Icon size={size} className={className} aria-hidden />;
}
