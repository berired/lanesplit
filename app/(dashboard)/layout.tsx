import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { NavBar, NavBarSkeleton } from "@/components/ui/nav-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<NavBarSkeleton />}>
        <AuthedNavBar />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}

async function AuthedNavBar() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <NavBar displayName={user.displayName} />;
}
