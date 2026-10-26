"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@appraisal/shared/src/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ResetFormValues = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      recoveryWords: Array(6).fill(""),
      newPassword: "",
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setErrors({});
    setIsSubmitting(true);

    try {
      await api.auth.resetPassword(data);

      toast.success("Пароль успешно сброшен! Теперь вы можете войти.");
      setIsOpen(false);
      form.reset();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({ email: error.message });
      } else {
        toast.error("Ошибка при сбросе пароля");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (fieldName: string) => {
    return errors[fieldName] ? "border-red-500 focus-visible:ring-red-500" : "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <span className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline">
          Забыли пароль?
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Сброс пароля</DialogTitle>
          <DialogDescription>
            Введите email и любые 6 из 12 контрольных слов, указанных при
            регистрации.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              {...form.register("email")}
              placeholder="name@company.ru"
              className={getInputClass("email")}
            />
            <p
              className={`text-xs text-red-500 min-h-4 ${!errors["email"] ? "opacity-0" : ""}`}
            >
              {errors["email"] || "."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Новый пароль</Label>
            <Input
              type="password"
              {...form.register("newPassword")}
              placeholder="••••••••"
              className={getInputClass("newPassword")}
            />
            <p
              className={`text-xs text-red-500 min-h-4 ${!errors["newPassword"] ? "opacity-0" : ""}`}
            >
              {errors["newPassword"] || "."}
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-bold">6 контрольных слов</Label>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Input
                  key={index}
                  {...form.register(`recoveryWords.${index}`)}
                  placeholder={`${index + 1}`}
                  className="h-9 text-sm text-center"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Достаточно совпадения 6 любых слов из вашего списка.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              {isSubmitting ? "Проверка..." : "Сбросить пароль"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
