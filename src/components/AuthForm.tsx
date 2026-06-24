"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginAction,
  registerAction,
  resendConfirmationAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { ui } from "@/lib/ui";

const initialState: AuthActionState = {};

type AuthFormProps = {
  mode: "login" | "register";
  next?: string;
  callbackError?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[13px] text-red-400">{message}</p>;
}

export function AuthForm({ mode, next, callbackError }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [resendState, resendAction, isResending] = useActionState(
    resendConfirmationAction,
    initialState
  );

  const isLogin = mode === "login";
  const displayError = state.error ?? resendState.error ?? callbackError;
  const displaySuccess = state.success ?? resendState.success;
  const pendingEmail = state.pendingEmail ?? resendState.pendingEmail;

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-10 text-center">
        <p className={ui.eyebrow}>LHW</p>
        <h1 className={`mt-3 ${ui.titleLg}`}>
          {isLogin ? (
            <>
              <span className="font-extralight">登录</span>
            </>
          ) : (
            <>
              <span className="font-extralight">创建</span>
              <span className={ui.titleAccent}>账户</span>
            </>
          )}
        </h1>
        <p className={`mt-2 text-[17px] ${ui.subtitle}`}>
          {isLogin ? "使用邮箱登录你的账户" : "注册后将发送验证邮件"}
        </p>
      </div>

      <div className={ui.card}>
        <form action={formAction} className="space-y-5" noValidate>
          {!isLogin && (
            <div>
              <label htmlFor="username" className={`mb-2 block ${ui.label}`}>
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className={ui.input}
                placeholder="your_name"
              />
              <FieldError message={state.fieldErrors?.username} />
            </div>
          )}

          <div>
            <label htmlFor="email" className={`mb-2 block ${ui.label}`}>
              邮箱
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={pendingEmail}
              className={ui.input}
              placeholder="name@example.com"
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <div>
            <label htmlFor="password" className={`mb-2 block ${ui.label}`}>
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              className={ui.input}
              placeholder={isLogin ? "输入密码" : "至少 8 位，含字母和数字"}
            />
            <FieldError message={state.fieldErrors?.password} />
          </div>

          {isLogin && next && <input type="hidden" name="next" value={next} />}

          {displayError && (
            <div
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[15px] text-red-600 dark:text-red-400"
              role="alert"
            >
              {typeof displayError === "string"
                ? displayError
                : "注册失败，请稍后重试"}
            </div>
          )}

          {displaySuccess && (
            <div
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[15px] leading-relaxed text-emerald-600 dark:text-emerald-400"
              role="status"
            >
              {displaySuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full ${ui.btnPrimary} !py-3.5 !text-[17px]`}
          >
            {isPending ? "请稍候…" : isLogin ? "登录" : "注册"}
          </button>
        </form>

        {pendingEmail && displaySuccess && (
          <form action={resendAction} className="mt-4">
            <input type="hidden" name="email" value={pendingEmail} />
            <button
              type="submit"
              disabled={isResending}
              className="w-full text-center text-[15px] text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white disabled:opacity-50"
            >
              {isResending ? "发送中…" : "没收到？重新发送验证邮件"}
            </button>
          </form>
        )}
      </div>

      <p className={`mt-8 text-center ${ui.subtitle}`}>
        {isLogin ? "还没有账户？" : "已有账户？"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-200"
        >
          {isLogin ? "注册" : "登录"}
        </Link>
      </p>
    </div>
  );
}
