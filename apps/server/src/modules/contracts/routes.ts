import { Hono } from "hono";
import {
  getContractsList,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
} from "./service";
import {
  createAppraisingContractSchema,
  updateAppraisingContractSchema,
} from "@appraisal/shared/src/schemas";

const router = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

router.get("/", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const contracts = await getContractsList();
    return c.json(contracts);
  } catch (error) {
    console.error("Ошибка получения списка договоров:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.get("/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const contractId = c.req.param("id");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contractId,
      )
    ) {
      return c.json({ error: "Невалидный ID договора" }, 400);
    }

    const contract = await getContractById(contractId);
    if (!contract) {
      return c.json({ error: "Договор не найден" }, 404);
    }

    return c.json(contract);
  } catch (error) {
    console.error("Ошибка получения договора:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.post("/", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const parsed = createAppraisingContractSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const newContract = await createContract(parsed.data);
    return c.json(newContract, 201);
  } catch (error) {
    console.error("Ошибка создания договора:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при создании договора" },
      500,
    );
  }
});

router.put("/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const contractId = c.req.param("id");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contractId,
      )
    ) {
      return c.json({ error: "Невалидный ID договора" }, 400);
    }

    const body = await c.req.json();
    const parsed = updateAppraisingContractSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedContract = await updateContract(contractId, parsed.data);
    if (!updatedContract) {
      return c.json({ error: "Договор не найден" }, 404);
    }

    return c.json(updatedContract);
  } catch (error) {
    console.error("Ошибка обновления договора:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при обновлении договора" },
      500,
    );
  }
});

router.delete("/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const contractId = c.req.param("id");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        contractId,
      )
    ) {
      return c.json({ error: "Невалидный ID договора" }, 400);
    }

    const result = await deleteContract(contractId);
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ message: "Договор успешно удалён" });
  } catch (error) {
    console.error("Ошибка удаления договора:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при удалении договора" },
      500,
    );
  }
});

export const contractsRoutes = router;
