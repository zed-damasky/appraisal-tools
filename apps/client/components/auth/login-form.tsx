"use client";

import { useForm } from "react-hook-form";
import { loginSchema } from "@appraisal/shared/src/schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { ForgotPasswordModal } from "./forgot-password-modal";
import { SeamlessPatternBackground } from "@/components/background/seamless-pattern-background";

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login: storeLogin } = useAuthStore();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setErrors({});
    setIsSubmitting(true);

    try {
      loginSchema.parse(data);

      const response: any = await api.auth.login(data);

      if (response.token && response.user) {
        storeLogin(response.user, response.token);
        toast.success("Добро пожаловать!");
        router.push("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path.join(".")] = issue.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        setErrors({
          password: error.message,
          email: error.message,
        });
      } else {
        toast.error("Ошибка авторизации");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (fieldName: string) => {
    return errors[fieldName] ? "border-red-500 focus-visible:ring-red-500" : "";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 ">
      <SeamlessPatternBackground
        gradient={{ from: "#e0f2fe", to: "#bae6fd", angle: 13 }}
        iconColor="#000fff"
        tileSize={250}
        iconsPerTile={9}
        iconSize={28}
        className="opacity-40"
      />

      <Card className="[--card-spacing:0px] w-full max-w-4xl grid md:grid-cols-2 overflow-hidden shadow-2xl border-slate-200 relative z-10 bg-white/95 backdrop-blur-sm">
        {/* Левая колонка: Брендинг */}
        <div className="hidden md:flex flex-col items-center justify-center bg-blue-600 p-12 text-white space-y-6 relative z-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white border-2 border-blue-800 shadow-[6px_6px_0px_rgba(30,58,138,0.4)]">
            <Building2 size={40} strokeWidth={2} className="text-blue-700" />
          </div>

          <div className="text-center space-y-3">
            <CardTitle className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
              Appraisal Tools
            </CardTitle>
            <CardDescription className="text-base text-blue-100/90 font-medium leading-relaxed">
              Профессиональная система
              <br />
              автоматизации оценки имущества
            </CardDescription>
          </div>
        </div>

        {/* Правая колонка: Форма */}
        <CardContent className="flex flex-col justify-center p-8 md:p-12 space-y-8 relative z-10">
          {/* Мобильный заголовок (виден только на md-) */}
          <div className="md:hidden text-center space-y-2 mb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 size={24} />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">
              Appraisal Tools
            </CardTitle>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-700"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.ru"
                  className={`h-11 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 ${getInputClass("email")}`}
                  {...form.register("email")}
                />
                <p
                  className={`text-xs text-red-500 font-medium min-h-5 ${!errors["email"] ? "opacity-0" : ""}`}
                >
                  {errors["email"] || "."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Пароль
                  </Label>
                  <ForgotPasswordModal />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`h-11 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 ${getInputClass("password")}`}
                  {...form.register("password")}
                />
                <p
                  className={`text-xs text-red-500 font-medium min-h-5 ${!errors["password"] ? "opacity-0" : ""}`}
                >
                  {errors["password"] || "."}
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-bold shadow-sm transition-all active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Проверка данных..." : "Войти в систему"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-slate-600">Нет аккаунта? </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-blue-600"
                onClick={() => router.push("/register")}
              >
                Зарегистрироваться
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
