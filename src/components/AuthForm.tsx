"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginAction,
  registerAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = {};

type AuthFormProps = {
  mode: "login" | "register";
  next?: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isLogin
            ? "Sign in to access your personal page"
            : "Join us with email and password"}
        </p>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        {!isLogin && (
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-zinc-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="your_username"
            />
            <FieldError message={state.fieldErrors?.username} />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            placeholder="you@example.com"
          />
          <FieldError message={state.fieldErrors?.email} />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
          />
          <FieldError message={state.fieldErrors?.password} />
          {!isLogin && (
            <p className="mt-1 text-xs text-zinc-400">
              Use 8+ characters with letters and numbers
            </p>
          )}
        </div>

        {isLogin && next && <input type="hidden" name="next" value={next} />}

        {state.error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
