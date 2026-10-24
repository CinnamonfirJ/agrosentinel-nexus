import { Suspense } from "react";
import { Login } from "./login";
export const metadata = { title: "Sign in · AgroSentinel Nexus" };
export default function Page() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
