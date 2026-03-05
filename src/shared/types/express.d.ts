import "express";
import { WorkspaceRole, BoardRole } from "@prisma/client";

declare module "express" {
  interface Request {
    user?: {
      id:    string;
      email: string;
    };
    workspaceRole?: WorkspaceRole;
    boardRole?:     BoardRole;
  }
}