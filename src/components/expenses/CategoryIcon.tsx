import {
  Banknote,
  Briefcase,
  Car,
  Gamepad2,
  MoreHorizontal,
  ShoppingBag,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  餐饮: Utensils,
  交通: Car,
  购物: ShoppingBag,
  娱乐: Gamepad2,
  杂项: MoreHorizontal,
  工资: Banknote,
  理财: TrendingUp,
  兼职: Briefcase,
};

export function CategoryIcon({
  category,
  size = 18,
  className,
  style,
}: {
  category: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
  return <Icon size={size} className={className} style={style} aria-hidden />;
}
