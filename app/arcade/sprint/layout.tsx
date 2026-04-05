import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sprint | CLCC Arcade",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
