import { CliArgs } from './CliArgs'

export interface VersionProjectCliArgs extends CliArgs {
    path?: string;
    detect?: boolean;
    update?: string | boolean;
}
