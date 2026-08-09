import type { Metadata } from "next";
import { repo } from "@/lib/db";
import { IsraelMap } from "@/components/IsraelMap";

export const metadata: Metadata = { title: "פרויקטים" };
export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await repo.getProjects();
  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:px-12">
      <h1 className="font-display text-4xl">העצים שלנו, בכל הארץ</h1>
      <p className="mt-2 text-sm text-ink-muted">
        לחצו על נעץ במפה — מאחורי כל אחד מסתתר עץ שיצא מהשורות שלנו ונקלט בבית
        חדש.
      </p>
      <div className="mt-10">
        <IsraelMap projects={projects.filter((p) => p.published)} />
      </div>
    </div>
  );
}
