import { CliArgs } from './CliArgs'

export interface CommitCliArgs extends CliArgs {
    message?: string;           // Commit başlığıı
    body?: string[];            // Commit mesajı
    all?: boolean;              // Tüm değişiklikleri sahneler
    file?: string[];            // Belirli dosyaları commit eder
    type?: string;              // Commit türü (feat, fix, chore, etc.)
    scope?: string;             // Commit kapsamı
    breaking?: boolean;         // Breaking change olup olmadığını belirtir
    sign?: boolean;             // Commit'i imzalar
    noVerify?: boolean;         // Pre-commit ve commit-msg kancalarını atlar
    dryRun?: boolean;           // İşlemleri göstermek için
    list?: boolean;             // Commitleri Listele
    count?: number;             // Commit Sayısı
    amend?: boolean;            // Önceki commit'e düzenleme yapar
    interactive?: boolean;      // İnteraktif menü
}