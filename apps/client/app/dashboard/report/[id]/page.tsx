"use client";

import { useParams } from "next/navigation";

export default function ReportEditorPage() {
  const params = useParams();
  const reportId = params.id as string;

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-lg text-slate-600">
        Редактор отчёта #{reportId}
      </div>
    </div>
  );
}