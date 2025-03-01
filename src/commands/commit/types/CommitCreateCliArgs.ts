import { CliArgs } from "../../types/CliArgs";

export interface CommitCreateCliArgs extends CliArgs {
    message?: string;
    body?: string[];
    stage?: "all" | "any" | string[];
    type?: string;              // Commit türü (feat, fix, chore, etc.)
    scope?: string;             // Commit kapsamı
    breaking?: boolean;         // Breaking change olup olmadığını belirtir
    sign?: boolean;             // Commit'i imzalar
    noVerify?: boolean;         // Pre-commit ve commit-msg kancalarını atlar
    dryRun?: boolean;           // İşlemleri göstermek için
}