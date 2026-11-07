/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminUser?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

