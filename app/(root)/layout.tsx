import React from "react";
import { FileSearchProvider } from "@/components/FileSearchProvider";
import { NotificationsProvider } from "@/components/Notifications";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import Header from "@/components/Header";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) return redirect("/sign-in");

  return (
    <FileSearchProvider>
      <NotificationsProvider>
        <main className="flex h-screen">
          <Sidebar {...currentUser} />

          <section className="flex h-full min-w-0 flex-1 flex-col">
            <MobileNavigation {...currentUser} />
            <Header
              userId={currentUser.$id}
              accountId={currentUser.accountId}
            />
            <div className="main-content">{children}</div>
          </section>

          <Toaster />
        </main>
      </NotificationsProvider>
    </FileSearchProvider>
  );
};
export default Layout;
