import { notFound } from "next/navigation";
import { EnvironmentReviewLab } from "@/components/environment/dev/EnvironmentReviewLab";

export const metadata = {
  title: "Environment Lab (Dev Only)",
};

export default function EnvironmentLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <EnvironmentReviewLab />;
}
