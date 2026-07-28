import { Component, type ErrorInfo, type ReactNode } from "react";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";

type Props = { children: ReactNode };
type State = { error: Error | null };

function isArabicUi() {
  if (typeof document === "undefined") return true;
  return (document.documentElement.lang || "ar").toLowerCase().startsWith("ar");
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const arUi = isArabicUi();
      const copy = arUi ? ar.errorBoundary : en.errorBoundary;
      return (
        <div
          dir={arUi ? "rtl" : "ltr"}
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground"
        >
          <h1 className="font-display text-2xl font-bold text-destructive">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-lg">
            {copy.body}
          </p>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            {copy.reload}
          </button>
          <details className="mt-2 max-w-lg text-center">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {copy.technical}
            </summary>
            <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
              {this.state.error.message}
            </p>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
