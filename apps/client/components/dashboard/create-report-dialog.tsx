"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppraisingReportSchema } from "@appraisal/shared/src/schemas";
import { api, type CreateReportInput } from "@/lib/api";
import { toast } from "sonner";
import { FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { LocalPathPicker } from "@/components/local-path-picker/local-path-picker";

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateReportDialog({
  open,
  onOpenChange,
}: CreateReportDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reportSequenceNumber, setReportSequenceNumber] = useState("");
  const [reportDir, setReportDir] = useState("");

  const [isPathPickerOpen, setIsPathPickerOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!reportDir || reportDir.trim() === "") {
      setErrors({ reportDir: "Укажите путь к папке" });
      return;
    }

    const validationResult = createAppraisingReportSchema.safeParse({
      reportSequenceNumber,
      clientName: "Не указан",
      reportDir: reportDir.trim(),
      appraisingContractId: crypto.randomUUID(),
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path === "clientName") return;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      });

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload: CreateReportInput = validationResult.data || {
        reportSequenceNumber,
        clientName: "Не указан",
        reportDir: reportDir.trim(),
        appraisingContractId: crypto.randomUUID(),
      };

      const response = await api.reports.create(payload);

      if (response && response.id) {
        toast.success(`Отчёт №${payload.reportSequenceNumber} успешно создан`);
        onOpenChange(false);
        setReportSequenceNumber("");
        setReportDir("");
        router.push(`/dashboard/report/${response.id}`);
      } else {
        throw new Error("Некорректный ответ сервера");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Ошибка при создании отчёта",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setErrors({});
        }
      }}
    >
      <DialogContent className="sm:max-w-112.5 p-10">
        <DialogHeader>
          <DialogTitle>Создание нового отчёта</DialogTitle>
          <DialogDescription>
            Укажите номер отчёта и выберите папку для хранения файлов через
            встроенный проводник.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Номер отчёта */}
          <div className="space-y-2">
            <Label htmlFor="seq-num">Номер отчёта *</Label>
            <Input
              id="seq-num"
              placeholder="Например: 001-2026"
              value={reportSequenceNumber}
              onChange={(e) => {
                setReportSequenceNumber(e.target.value);
                if (errors.reportSequenceNumber)
                  setErrors((prev) => ({ ...prev, reportSequenceNumber: "" }));
              }}
              className={
                errors.reportSequenceNumber
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {errors.reportSequenceNumber && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{" "}
                {errors.reportSequenceNumber}
              </p>
            )}
          </div>

          {/* Выбор директории */}
          <div className="space-y-2">
            <Label>Папка для отчёта *</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPathPickerOpen(true)}
              className={`w-full justify-start ${errors.reportDir ? "border-red-500 text-red-500 hover:bg-red-50" : ""}`}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {reportDir || "Выбрать папку..."}
            </Button>
            {/*
            {reportDir && !errors.reportDir && (
              <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-mono text-xs break-all">
                    {reportDir}
                  </span>
                </p>
              </div>
            )}
            */}
            {errors.reportDir && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.reportDir}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Создание..." : "Создать отчёт"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Модальное окно выбора пути */}
      <LocalPathPicker
        open={isPathPickerOpen}
        onOpenChange={setIsPathPickerOpen}
        onSelect={(path) => {
          setReportDir(path);
          setErrors((prev) => ({ ...prev, reportDir: "" }));
        }}
      />
    </Dialog>
  );
}
