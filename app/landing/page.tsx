import { redirect } from "next/navigation";
// The public story now lives at the root.
export default function LandingRedirect() {
  redirect("/");
}
