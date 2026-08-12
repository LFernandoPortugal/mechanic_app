import { expect, test, type Page } from "@playwright/test";

const fixturePassword = "FixturePassword123!";

async function signIn(page: Page, email: string) {
  await page.getByLabel("Correo Electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(fixturePassword);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
}

test("an ADMIN returns to the protected destination and opens user management", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login\?redirect=%2Finventory$/);

  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();

  await page.getByRole("link", { name: "Gestión de Usuarios" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "Gestión de Usuarios" })).toBeVisible();
  await expect(page.getByText("2 usuarios registrados")).toBeVisible();
});

test("a RECEPTION user is denied technician access and can sign out", async ({ page }) => {
  await page.goto("/login");
  await signIn(page, "reception.e2e@example.com");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "SGA" })).toBeVisible();

  await page.goto("/technician");
  await expect(page.getByRole("heading", { name: "Acceso Denegado" })).toBeVisible();
  await expect(page.getByText("Roles requeridos:")).toBeVisible();
  await expect(page.getByText("ADMIN, TECHNICIAN")).toBeVisible();

  await page.getByRole("button", { name: "Cerrar Sesión" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Ftechnician$/);
  await expect(page.getByRole("button", { name: "Iniciar Sesión" })).toBeVisible();
});

test("an ADMIN registers a signed reception and submits its diagnosis", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const plate = `E2E-${401 + testInfo.retry}`;

  await page.goto("/login");
  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/reception");
  await expect(page.getByRole("heading", { name: "Recepción de Vehículo" })).toBeVisible();

  await page.getByLabel("Placa *").fill(plate);
  await page.getByLabel("Marca *").fill("Toyota");
  await page.getByLabel("Modelo").fill("Corolla E2E");
  await page.getByLabel("Nombre del Cliente *").fill("Cliente E2E");
  await page.getByLabel("Teléfono").fill("999888777");
  await page.locator("#reception-symptoms").fill("Ruido metálico al frenar durante la prueba E2E.");

  const signatureCanvas = page.locator("canvas");
  await signatureCanvas.scrollIntoViewIfNeeded();
  const signatureBox = await signatureCanvas.boundingBox();
  if (!signatureBox) throw new Error("The reception signature canvas is not visible.");

  await page.mouse.move(signatureBox.x + 40, signatureBox.y + 75);
  await page.mouse.down();
  await page.mouse.move(signatureBox.x + 110, signatureBox.y + 45, { steps: 4 });
  await page.mouse.move(signatureBox.x + 180, signatureBox.y + 85, { steps: 4 });
  await page.mouse.up();

  const confirmSignature = page.getByRole("button", { name: "Confirmar Firma" });
  await expect(confirmSignature).toBeEnabled();
  await confirmSignature.click();
  await expect(page.getByText("Firma confirmada")).toBeVisible();

  await page.getByRole("button", { name: "Registrar e Iniciar" }).click();
  await expect(page.getByRole("heading", { name: "Recepción Completa" })).toBeVisible();
  await expect(page.getByText(`El vehículo ${plate} está ahora en cola para inspección.`)).toBeVisible();

  await page.getByRole("button", { name: "Ir al Panel de Técnico" }).click();
  await expect(page).toHaveURL(/\/technician$/);
  await expect(page.getByRole("heading", { name: "Área de Técnico" })).toBeVisible();

  const jobButton = page.getByRole("button").filter({ hasText: plate });
  await expect(jobButton).toBeVisible();
  await jobButton.click();
  await expect(jobButton.getByText("Diagnóstico", { exact: true })).toBeVisible();
  await expect(page.getByText("Diagnóstico e Inspecciones", { exact: true })).toBeVisible();

  await page.getByLabel("Detalle del Componente (ej. Pastillas de Freno)").fill("Pastillas de freno delanteras");
  await page.getByLabel("Notas del Técnico").fill("Desgaste detectado durante la inspección E2E.");
  await page.getByRole("button", { name: "Registrar Elemento" }).click();
  await expect(page.getByText("Pastillas de freno delanteras", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enviar Diagnóstico al Asesor" }).click();
  await expect(page.getByRole("heading", { name: "Diagnóstico Enviado" })).toBeVisible();
  await expect(page.getByText(`El vehículo ${plate} está listo para cotización.`)).toBeVisible();
});
