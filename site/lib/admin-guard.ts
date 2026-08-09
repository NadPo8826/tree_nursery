import { redirect } from "next/navigation";
import { isAuthenticated, isConfigured } from "@/lib/auth";

/** Call at the top of every protected /admin page. */
export async function requireAdminPage(): Promise<void> {
  if (!isConfigured()) redirect("/admin/login?setup=1");
  if (!(await isAuthenticated())) redirect("/admin/login");
}
