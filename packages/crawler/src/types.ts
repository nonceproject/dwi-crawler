export interface Record {
  addr?: string;
  contentDocument?: string;
  contentHash?: string;
  contentLinks?: {
    Name: string;
    Hash: string;
    Size: number;
  }[];
  contentTitle?: string;
  ensName: string;
  latestTransactions?: string[];
  resolverAddr?: string;
}
