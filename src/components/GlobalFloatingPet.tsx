"use client";

import { usePathname } from "next/navigation";
import PetAssistant from "@/components/PetAssistant";

export default function GlobalFloatingPet() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return <PetAssistant mode="floating" />;
}
