import { Suspense } from "react";
import KidApp from "@/components/kid/KidApp";

export default function KidPage({ params }: PageProps<"/kid/[token]">) {
  return (
    <Suspense fallback={<div className="kid-bg min-h-dvh" />}>
      <Kid params={params} />
    </Suspense>
  );
}

async function Kid({ params }: { params: PageProps<"/kid/[token]">["params"] }) {
  const { token } = await params;
  return <KidApp token={token} />;
}
