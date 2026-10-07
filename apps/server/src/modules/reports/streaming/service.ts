import path from "path";
import { getReport } from "../../../services/storage";
import { getBaseDir } from "../../../config";
import type { AppraisingReport, Document } from "@appraisal/types";
import { AllowedMimeType } from "@appraisal/types";

function findFileInReport(
  report: AppraisingReport,
  fileId: string,
): Document | null {
  const inDocs = report.files.docs?.find((d) => d.id === fileId);
  if (inDocs) return inDocs;

  const inPhotos = report.files.photos?.find((p) => p.id === fileId);
  if (inPhotos) return inPhotos;

  const marketAnalysis = report.marketAnalysis;
  const chapterArrays = [
    marketAnalysis.macroAnalysisChapter,
    marketAnalysis.regionAnalysisChapter,
    marketAnalysis.marketSegmentChapter,
    marketAnalysis.analoguesChapter,
    marketAnalysis.nhueChapter,
    marketAnalysis.liquidityChapter,
    marketAnalysis.marketConclusionsChapter,
  ];

  for (const chapterArray of chapterArrays) {
    if (Array.isArray(chapterArray)) {
      const found = chapterArray.find((c: any) => c.id === fileId);
      if (found) {
        let mimeType = AllowedMimeType.DOC;
        if (found.path.endsWith(".pdf")) {
          mimeType = AllowedMimeType.PDF;
        } else if (found.path.endsWith(".docx")) {
          mimeType = AllowedMimeType.DOCX;
        }

        return {
          id: found.id,
          name: found.fileName || "document",
          path: found.path,
          mimeType: mimeType,
          size: 0,
        };
      }
    }
  }

  return null;
}

export async function getFileInfoForStreaming(
  reportId: string,
  fileId: string,
): Promise<{ fullPath: string; meta: Document } | null> {
  const baseDir = getBaseDir();
  const report = await getReport(baseDir, reportId);
  if (!report) return null;

  const meta = findFileInReport(report, fileId);
  if (!meta) return null;

  const fullPath = path.isAbsolute(meta.path)
    ? meta.path
    : path.join(report.files.reportDir, meta.path);

  return { fullPath, meta };
}
