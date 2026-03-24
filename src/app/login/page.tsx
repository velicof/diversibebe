import { Suspense } from "react";
import LoginForm from "./LoginForm";

type LoginSearchParams = { [key: string]: string | string[] | undefined };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const sp = await searchParams;
  const err = sp.error;
  const initialLoginError =
    typeof err === "string" ? err : Array.isArray(err) ? err[0] : undefined;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#FFF8F6] flex items-center justify-center px-6">
          <p className="text-[14px] text-[#8B7A8E]">Se încarcă…</p>
        </div>
      }
    >
      <LoginForm initialLoginError={initialLoginError} />
    </Suspense>
  );
}
