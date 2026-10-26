"use client";

import { useForm } from "react-hook-form";
import { registerSchema } from "@appraisal/shared/src/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const formSchema = registerSchema.omit({ appraiser: true }).extend({
  appraiser: registerSchema.shape.appraiser.omit({ id: true }),
});

type RegisterFormValues = z.infer<typeof formSchema>;

const hasDuplicates = (arr: string[]) => {
  const normalized = arr.map((s) => s.toLowerCase().trim());
  const filtered = normalized.filter((s) => s !== "");
  return new Set(filtered).size !== filtered.length;
};

const getValueByPath = (obj: any, path: string) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = useForm<RegisterFormValues>({
    defaultValues: {
      appraiser: {
        fullName: "",
        contacts: { email: "", phone: "" },
        hasPrivatePractice: false,
      },
      password: "",
      recoveryWords: Array(12).fill(""),
    },
  });

  const watchedValues = form.watch();
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  const getErrorText = (fieldName: string) => {
    return errors[fieldName] || "";
  };

  useEffect(() => {
    const currentErrors = errorsRef.current;
    if (Object.keys(currentErrors).length === 0) return;

    setErrors((prev) => {
      const updated = { ...prev };
      let isChanged = false;

      if (
        updated["recoveryWords.duplicate"] &&
        !hasDuplicates(watchedValues.recoveryWords)
      ) {
        delete updated["recoveryWords.duplicate"];
        isChanged = true;
      }

      Object.keys(updated).forEach((key) => {
        if (key === "recoveryWords.duplicate") return;
        const value = getValueByPath(watchedValues, key);

        if (typeof value === "string" && value.trim() !== "") {
          delete updated[key];
          isChanged = true;
        } else if (value !== undefined && typeof value !== "string") {
          delete updated[key];
          isChanged = true;
        }
      });

      return isChanged ? updated : prev;
    });
  }, [watchedValues]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let value = input.value.replace(/\D/g, "");

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    const selectionStart = input.selectionStart;

    const isDeleting =
      (e.nativeEvent as any).inputType === "deleteContentBackward";

    if (isDeleting && value.length > 0) {
      const lastChar = input.value[selectionStart || 0];
      if (lastChar === " " || lastChar === ")" || lastChar === "-") {
        value = value.slice(0, -1);
      }
    }

    let formatted = "";
    if (value.length > 0) {
      formatted = "+7";
      if (value.length > 1) formatted += " (" + value.slice(1, 4);
      if (value.length > 4) formatted += ") " + value.slice(4, 7);
      if (value.length > 7) formatted += "-" + value.slice(7, 9);
      if (value.length > 9) formatted += "-" + value.slice(9, 11);
    }

    form.setValue("appraiser.contacts.phone", formatted, {
      shouldValidate: true,
    });

    setTimeout(() => {
      if (selectionStart) {
        const diff = formatted.length - input.value.length;
        const newPos = Math.max(0, selectionStart + diff);
        input.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const data = form.getValues();

    try {
      if (hasDuplicates(data.recoveryWords)) {
        setErrors({
          "recoveryWords.duplicate": "Все 12 слов должны быть уникальными",
        });
        setIsSubmitting(false);
        return;
      }

      formSchema.parse(data);

      const payload = {
        ...data,
        appraiser: { ...data.appraiser, id: crypto.randomUUID() },
      };

      await api.auth.register(payload);
      toast.success("Регистрация успешна!");
      router.push("/login");
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          newErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(newErrors);
      } else {
        toast.error("Ошибка соединения с сервером");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (fieldName: string) => {
    return errors[fieldName] ? "border-red-500 focus-visible:ring-red-500" : "";
  };

  const hasArrayCellErrors = Object.keys(errors).some((k) =>
    k.startsWith("recoveryWords."),
  );
  const duplicateError = errors["recoveryWords.duplicate"];

  const { onChange: onPhoneRegisterChange, ...phoneRegisterProps } =
    form.register("appraiser.contacts.phone");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="[--card-spacing:0px] w-full max-w-5xl grid md:grid-cols-[1fr_1.5fr] overflow-hidden shadow-2xl border-slate-200">
        {/* Левая колонка: Брендинг */}
        <div className="hidden md:flex flex-col items-center justify-center bg-blue-600 p-12 text-white space-y-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white border-2 border-blue-800 shadow-[6px_6px_0px_rgba(30,58,138,0.4)]">
            <Building2 size={40} strokeWidth={2} className="text-blue-700" />
          </div>
          <div className="text-center space-y-3">
            <CardTitle className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
              Appraisal Tools
            </CardTitle>
            <p className="text-base text-blue-100/90 font-medium">
              Создайте аккаунт оценщика
            </p>
          </div>
        </div>

        {/* Правая колонка: Форма */}
        <CardContent className="flex flex-col p-4 md:p-4 space-y-6 max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основные поля */}
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>ФИО</Label>
                <Input
                  {...form.register("appraiser.fullName")}
                  placeholder="Иванов И.И."
                  className={getInputClass("appraiser.fullName")}
                />
                <p
                  className={`text-xs text-red-500 min-h-8 ${!errors["appraiser.fullName"] ? "opacity-0" : ""}`}
                >
                  {errors["appraiser.fullName"] || "."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  {...form.register("appraiser.contacts.email")}
                  placeholder="mail@example.com"
                  className={getInputClass("appraiser.contacts.email")}
                />
                <p
                  className={`text-xs text-red-500 min-h-8 ${!errors["appraiser.contacts.email"] ? "opacity-0" : ""}`}
                >
                  {errors["appraiser.contacts.email"] || "."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input
                  {...phoneRegisterProps}
                  onChange={(e) => {
                    onPhoneRegisterChange(e);
                    handlePhoneChange(e);
                  }}
                  placeholder="+7 999 123-45-67"
                  type="tel"
                  pattern="\+7\s?[\(]?\d{3}[\)]?\s?\d{3}[\-]?\d{2}[\-]?\d{2}"
                  className={`${getInputClass("appraiser.contacts.phone")}`}
                />
                <p
                  className={`text-xs text-red-500 min-h-8 ${!errors["appraiser.contacts.phone"] ? "opacity-0" : ""}`}
                >
                  {errors["appraiser.contacts.phone"] || "."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Пароль</Label>
                <Input
                  type="password"
                  {...form.register("password")}
                  placeholder="••••••••"
                  className={getInputClass("password")}
                />
                <p
                  className={`text-xs text-red-500 min-h-8 ${!errors["password"] ? "opacity-0" : ""}`}
                >
                  {errors["password"] || "."}
                </p>
              </div>
            </div>

            {/* Слова восстановления */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-bold text-slate-800">
                12 разных слов для сброса пароля (запомните или запишите их)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, index) => {
                  const hasError =
                    errors[`recoveryWords.${index}`] || duplicateError;
                  return (
                    <Input
                      key={index}
                      {...form.register(`recoveryWords.${index}`)}
                      placeholder={`${index + 1}`}
                      className={`h-9 text-sm text-center ${hasError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                  );
                })}
              </div>

              <p
                className={`text-xs text-red-500 min-h-8 ${!duplicateError && !hasArrayCellErrors ? "opacity-0" : ""}`}
              >
                {duplicateError ||
                  (hasArrayCellErrors
                    ? "Все 12 полей должны быть заполнены корректно"
                    : "") ||
                  "."}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Зарегистрироваться"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-slate-600">Уже есть аккаунт? </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-blue-600"
                onClick={() => router.push("/login")}
              >
                Войти
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
