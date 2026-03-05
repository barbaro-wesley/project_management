
// ── src/modules/columns/column.routes.ts ─────────────────────────────────────
import { Router } from "express";
import * as ColumnController from "./column.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireBoardRole } from "@shared/middlewares/rbac.guard";

const columnRouter = Router({ mergeParams: true }); // herda :boardId
columnRouter.use(authGuard);

columnRouter.get( "/",                    requireBoardRole("VIEWER"), ColumnController.list);
columnRouter.post("/",                    requireBoardRole("EDITOR"), ColumnController.create);
columnRouter.put( "/reorder",             requireBoardRole("EDITOR"), ColumnController.reorder);
columnRouter.put( "/:columnId",           requireBoardRole("EDITOR"), ColumnController.update);
columnRouter.delete("/:columnId",         requireBoardRole("OWNER"),  ColumnController.remove);

export { columnRouter };