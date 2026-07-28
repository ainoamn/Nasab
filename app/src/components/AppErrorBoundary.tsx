import { Component, type ErrorInfo, type ReactNode } from "react";

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
      const ar = isArabicUi();
      return (
        <div
          dir={ar ? "rtl" : "ltr"}
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background text-foreground"
        >
          <h1 className="font-display text-2xl font-bold text-destructive">
            {ar ? "حدث خطأ في تحميل الصفحة" : "Something went wrong loading the page"}
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-lg">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            {ar ? "إعادة تحميل الصفحة" : "Reload page"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
