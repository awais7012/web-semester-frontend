import { Suspense } from "react";
import { ResetPasswordView } from "@/modules/auth/ui/views/reset-password-view";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
