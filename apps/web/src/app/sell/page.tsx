import type { Metadata } from "next";
import { SellerDashboard } from "../components/seller-dashboard";

export const metadata: Metadata = { title: "发布管理" };

export default function SellPage() {
  return <SellerDashboard />;
}
