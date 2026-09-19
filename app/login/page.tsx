import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { LoginForm } from "@/frontend/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <h1 className="font-heading text-3xl">Host login</h1>
        <p className="mt-2 mb-8 text-muted-foreground">
          Guests never sign in. This door is only for people creating events and reading the match board.
        </p>
        <LoginForm />
      </main>
    </div>
  );
}
