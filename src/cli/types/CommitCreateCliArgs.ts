import { CliArgs } from "./CliArgs";

export interface CommitCreateCliArgs extends CliArgs {
    message?: string;
    body?: string[];
    add?: "all" | "empty" | string[];
    type?: string;              // Commit türü (feat, fix, chore, etc.)
    scope?: string;             // Commit kapsamı
    breaking?: boolean;         // Breaking change olup olmadığını belirtir
    sign?: boolean;             // Commit'i imzalar
    noVerify?: boolean;         // Pre-commit ve commit-msg kancalarını atlar
    dryRun?: boolean;           // İşlemleri göstermek için
}