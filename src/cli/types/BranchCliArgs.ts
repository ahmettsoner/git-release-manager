import { CliArgs } from './CliArgs'

export interface BranchCliArgs extends CliArgs {
    create?: string;
    delete?: string;
    list?: boolean;
    switch?: string;
    merge?: string;
    release?: string;
    hotfix?: string;
    feature?: string;
    finish?: string;
    protect?: string;
    unprotect?: string;
    rebase?: string;
    sync?: boolean;
    push?: boolean;
}
