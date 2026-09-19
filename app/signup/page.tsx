import { Suspense } from "react";
import { LoginPageView } from "@/frontend/components/map-view/LoginPageView";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageView initialMode="signup" />
    </Suspense>
  );
}

