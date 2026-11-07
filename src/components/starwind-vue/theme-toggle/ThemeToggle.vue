<script setup lang="ts">
import type { ClassValue, VariantProps } from "tailwind-variants";
import { type ButtonHTMLAttributes, onMounted, onUnmounted, ref } from "vue";
import { themeToggle } from "./variants";

defineOptions({ inheritAttrs: false });

export type ThemeToggleProps = Omit<
  ButtonHTMLAttributes,
  | "aria-pressed"
  | "ariaLabel"
  | "class"
  | "data-slot"
  | "defaultPressed"
  | "disabled"
  | "onChange"
  | "pressed"
  | "syncGroup"
  | "type"
  | "value"
> &
  VariantProps<typeof themeToggle> & {
    ariaLabel?: string;
    defaultPressed?: boolean;
    disabled?: boolean;
    "data-slot"?: string;
    pressed?: boolean;
    syncGroup?: string;
    value?: string;
    class?: ClassValue;
  };

type ThemeToggleDeclaredProps = {
  ariaLabel?: string;
  defaultPressed?: boolean;
  disabled?: boolean;
  dataSlot?: string;
  pressed?: boolean;
  syncGroup?: string;
  value?: string;
  class?: ClassValue;
  variant?: ThemeToggleProps["variant"];
  size?: ThemeToggleProps["size"];
} & /* @vue-ignore */ Omit<ThemeToggleProps, "data-slot">;

const {
  ariaLabel = "Toggle theme",
  variant = "outline",
  size = "sm",
  disabled = false,
  dataSlot = "theme-toggle",
  class: className,
} = defineProps<ThemeToggleDeclaredProps>();

const isDark = ref(true);
const isReady = ref(false);
const element = ref<HTMLButtonElement | null>(null);
defineExpose({ element });

let observer: MutationObserver | null = null;

const syncTheme = () => {
  if (typeof document === "undefined") return;
  isDark.value = document.documentElement.classList.contains("dark");
  isReady.value = true;
};

const toggleTheme = () => {
  if (typeof document === "undefined") return;
  const nextIsDark = !document.documentElement.classList.contains("dark");
  
  if (nextIsDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  try {
    localStorage.setItem("colorTheme", nextIsDark ? "dark" : "light");
  } catch {}

  isDark.value = nextIsDark;

  // Dispatch event for any other listeners
  document.dispatchEvent(
    new CustomEvent("starwind:theme-change", {
      detail: {
        resolvedTheme: nextIsDark ? "dark" : "light",
        theme: nextIsDark ? "dark" : "light",
      },
    })
  );
};

onMounted(() => {
  syncTheme();

  // Watch for class changes on <html>
  observer = new MutationObserver(() => {
    syncTheme();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Also listen for storage events across tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "colorTheme") {
      const stored = e.newValue;
      if (stored === "dark") {
        document.documentElement.classList.add("dark");
      } else if (stored === "light") {
        document.documentElement.classList.remove("dark");
      }
      syncTheme();
    }
  };
  window.addEventListener("storage", handleStorage);
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <button
    ref="element"
    :class="themeToggle({ variant, size, class: className })"
    :disabled="disabled"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-pressed="isDark ? 'true' : 'false'"
    :data-state="isDark ? 'on' : 'off'"
    type="button"
    :data-slot="dataSlot || 'theme-toggle'"
    @click="toggleTheme"
    v-bind="$attrs"
  >
    <!-- Sun icon when dark (click to switch to light) -->
    <svg
      v-if="isDark"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-4.5 text-amber-400 hover:text-amber-300 transition-transform duration-200 hover:rotate-45"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>

    <!-- Moon icon when light (click to switch to dark) -->
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-4.5 text-slate-700 hover:text-slate-900 transition-transform duration-200 hover:-rotate-12"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  </button>
</template>
