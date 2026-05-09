import { Suspense } from "react";
import { VerifyEmailView } from "@/modules/auth/ui/views/verify-email-view";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailView />
    </Suspense>
  );
}
