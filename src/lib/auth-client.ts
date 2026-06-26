"use client";

import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import {
  validateEmail,
  validateLoginForm,
  validateRegisterForm,
} from "@/lib/validation";

export type AuthActionState = {
  error?: string;
  success?: string;
  pendingEmail?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    username?: string;
  };
  redirectTo?: string;
};

function formatAuthError(
  error: { message?: string; code?: string; status?: number } | null
) {
  if (!error) return "未知错误，请稍后重试";

  const message = error.message?.trim();
  if (message) {
    if (message.toLowerCase().includes("database error saving new user")) {
      return "注册失败：账户资料创建出错，请稍后重试或联系管理员。";
    }
    return message;
  }

  if (error.code) return `注册失败（${error.code}）`;
  return "注册失败，请稍后重试";
}

function getEmailRedirectTo(next = "/dashboard") {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function loginClient(
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const fieldErrors = validateLoginForm(email, password);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error: "邮箱尚未验证，请先查收验证邮件或重新发送。",
        pendingEmail: email.trim(),
      };
    }
    return { error: error.message };
  }

  return { redirectTo: next.startsWith("/") ? next : "/dashboard" };
}

export async function registerClient(
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "");

  const fieldErrors = validateRegisterForm(email, password, username);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: username.trim() },
      emailRedirectTo: getEmailRedirectTo("/dashboard"),
    },
  });

  if (error) {
    return { error: formatAuthError(error) };
  }

  if (data.user?.identities?.length === 0) {
    return { error: "该邮箱已注册，请直接登录。" };
  }

  if (data.session) {
    return { redirectTo: "/dashboard" };
  }

  return {
    success: `验证邮件已发送至 ${email.trim()}，请查收并点击链接完成注册。`,
    pendingEmail: email.trim(),
  };
}

export async function resendConfirmationClient(
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);
  if (emailError) {
    return { fieldErrors: { email: emailError } };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: getEmailRedirectTo("/dashboard"),
    },
  });

  if (error) {
    return { error: formatAuthError(error) };
  }

  return {
    success: `验证邮件已重新发送至 ${email}。`,
    pendingEmail: email,
  };
}

export async function logoutClient() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return { redirectTo: "/login" };
}
