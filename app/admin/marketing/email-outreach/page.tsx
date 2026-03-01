"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EmailOutreachRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/marketing");
  }, [router]);
  return null;
}
