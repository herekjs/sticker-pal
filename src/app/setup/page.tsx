import { redirect } from "next/navigation";

// 가족 생성은 관리자 화면에서 한다.
export default function SetupPage() {
  redirect("/admin");
}
