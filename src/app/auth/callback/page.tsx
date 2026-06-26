import { Suspense } from "react";
import AuthCallbackPage from "./page.client";

export default function AuthCallbackRoute() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackPage />
    </Suspense>
  );
}
