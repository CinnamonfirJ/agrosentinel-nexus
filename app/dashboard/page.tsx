import { Dashboard } from "../ui";
import { backendUrl } from "../backend-url";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Workspace } from "../../shared/contracts";
export const metadata = { title: "Regional overview · AgroSentinel Nexus" };
export default async function Page() {
  const jar = await cookies();
  const token = jar.get("agro_session")?.value;
  if (!token) redirect("/login");
  let initial: Workspace | null = null;
  try {
    const headers = { Authorization: "Bearer " + token };
    const auth = await fetch(backendUrl("api/auth/me"), {
      headers,
      cache: "no-store",
    });
    if (auth.status === 401) redirect("/login");
    if (auth.ok) {
      const person = await auth.json();
      if (person.role !== "manager") redirect("/field");
    }
    const response = await fetch(
      backendUrl("api/region-map?region=kaduna&period=24h"),
      { headers, cache: "no-store" },
    );
    if (response.ok) initial = await response.json();
  } catch (error) {
    if ((error as Error).message === "NEXT_REDIRECT") throw error;
  }
  return <Dashboard initialWorkspace={initial} />;
}
