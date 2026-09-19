import { redirect } from "next/navigation";
import { ProfileView } from "@/frontend/components/map-view/ProfileView";
import { getSession } from "@/backend/lib/auth";
import { getHost } from "@/backend/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const host = await getHost(session.host_id);
  const profile = host
    ? { ...host, password_hash: undefined }
    : {
        host_id: session.host_id,
        email: session.email,
        name: session.name || session.email,
        provider: session.provider,
        created_at: new Date().toISOString(),
      };

  return <ProfileView profile={profile} />;
}
