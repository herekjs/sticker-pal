import Link from "next/link";
import { LastKidLink } from "@/components/LastKidLink";

export default function Home() {
  return (
    <main className="kid-bg flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="text-8xl">🌟</div>
      <h1 className="mt-4 text-4xl">스티커 친구</h1>
      <p className="mt-2 text-lg text-black/60">매일 잘하면 스티커 하나!</p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-4">
        <LastKidLink />
        <Link
          href="/parent"
          className="rounded-3xl bg-white px-6 py-4 text-xl shadow-md ring-4 ring-white/70"
        >
          👨‍👩‍👧 엄마·아빠 로그인
        </Link>
        <Link href="/kid/demo" className="text-base text-black/50 underline">
          🧪 데모로 먼저 구경하기
        </Link>
      </div>
    </main>
  );
}
