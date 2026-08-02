import { CliArgs } from "../../types/CliArgs";

export interface BranchCliArgs extends CliArgs {
    create?: string;
    delete?: string;
    list?: boolean;
    switch?: string;
    merge?: string;
    release?: string;
    hotfix?: string;
    feature?: string;
    // `--finish` takes an OPTIONAL branch name: bare `--finish` means "the branch
    // I am standing on", which commander reports as boolean true. Typing this as
    // string alone forced the call site to lie about what the parser produces.
    finish?: string | boolean;
    protect?: string;
    unprotect?: string;
    rebase?: string;
    sync?: boolean;
    push?: boolean;
}
