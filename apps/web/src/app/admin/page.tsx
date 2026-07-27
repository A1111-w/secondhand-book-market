import type { Metadata } from "next";
import { AdminConsole } from "../components/admin-console";

export const metadata: Metadata = { title: "学生认证审核" };

export default function AdminPage() {
  return <AdminConsole />;
}
