import { tv } from "tailwind-variants";

export const dialogBackdrop = tv({
  base: [
    "fixed inset-0 top-0 left-0 z-50 h-screen w-screen bg-slate-950/75 backdrop-blur-sm duration-200",
    "data-[state=open]:animate-in fade-in",
    "data-[state=closed]:animate-out data-[state=closed]:fill-mode-forwards fade-out",
  ],
});

export const dialogContent = tv({
  base: [
    "fixed inset-0 m-auto z-50 h-fit max-h-[calc(100vh-2rem)] w-full max-w-md rounded-2xl border p-6 shadow-2xl",
    "bg-slate-900 border-slate-800 text-white",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fill-mode-forwards transition-all duration-200",
    "fade-in zoom-in-95",
    "fade-out zoom-out-95",
  ],
});

export const dialogCloseButton = tv({
  base: [
    "text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg p-1.5 transition-colors",
    "absolute top-4 right-4 cursor-pointer outline-none",
    "focus-visible:ring-2 focus-visible:ring-primary/50",
  ],
});

export const dialogDescription = tv({
  base: "text-muted-foreground",
});

export const dialogFooter = tv({
  base: "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
});

export const dialogHeader = tv({
  base: "flex flex-col space-y-2 text-center sm:text-left",
});

export const dialogTitle = tv({
  base: "font-heading text-xl leading-none font-semibold tracking-tight",
});
