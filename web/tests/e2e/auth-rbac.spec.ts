import { expect, test, type Page } from "@playwright/test";

const fixturePassword = "FixturePassword123!";

async function signIn(page: Page, email: string) {
  await page.getByLabel("Correo Electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(fixturePassword);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
}

async function drawAndConfirmSignature(page: Page) {
  const signatureCanvas = page.locator("canvas");
  await signatureCanvas.scrollIntoViewIfNeeded();
  const signatureBox = await signatureCanvas.boundingBox();
  if (!signatureBox) throw new Error("The signature canvas is not visible.");

  await page.mouse.move(signatureBox.x + 40, signatureBox.y + 75);
  await page.mouse.down();
  await page.mouse.move(signatureBox.x + 110, signatureBox.y + 45, { steps: 4 });
  await page.mouse.move(signatureBox.x + 180, signatureBox.y + 85, { steps: 4 });
  await page.mouse.up();

  const confirmSignature = page.getByRole("button", { name: "Confirmar Firma" });
  await expect(confirmSignature).toBeEnabled();
  await confirmSignature.click();
  await expect(page.getByText("Firma confirmada")).toBeVisible();
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

test("an ADMIN takes a signed reception through delivery", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
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

  await drawAndConfirmSignature(page);

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
  await page.getByRole("button", { name: "Falla", exact: true }).click();
  await page.getByRole("button", { name: "Registrar Elemento" }).click();
  await expect(page.getByText("Pastillas de freno delanteras", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Enviar Diagnóstico al Asesor" }).click();
  await expect(page.getByRole("heading", { name: "Diagnóstico Enviado" })).toBeVisible();
  await expect(page.getByText(`El vehículo ${plate} está listo para cotización.`)).toBeVisible();

  await page.getByRole("button", { name: "Ir al Panel de Asesor" }).click();
  await expect(page).toHaveURL(/\/advisor$/);
  await expect(page.getByRole("heading", { name: "Área de Asesor" })).toBeVisible();

  const quoteJobButton = page.getByRole("button").filter({ hasText: plate });
  await expect(quoteJobButton).toBeVisible();
  await quoteJobButton.click();
  await page.getByLabel("Precio Repuesto (S/.)").fill("120");
  await page.getByLabel("Mano de Obra Global (S/.)").fill("50");
  await expect(page.getByText("S/.170.00", { exact: true })).toBeVisible();

  const quoteLinkResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/jobs/")
      && response.url().endsWith("/quote-link")
      && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Generar Cotización y Enviar Confirmación" }).click();
  const quoteLinkResponse = await quoteLinkResponsePromise;
  expect(quoteLinkResponse.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Cotización Generada" })).toBeVisible({ timeout: 15_000 });

  const clientPagePromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Abrir Vista del Cliente" }).click();
  const clientPage = await clientPagePromise;
  await expect(clientPage).toHaveURL(/\/quote\/view\?id=[A-Za-z0-9]{20}#token=[A-Za-z0-9_-]+$/);
  await expect(clientPage.getByRole("heading", { name: /Portal del Cliente/ })).toBeVisible({ timeout: 30_000 });
  await expect(clientPage.getByText("S/. 170.00", { exact: true })).toBeVisible();

  await drawAndConfirmSignature(clientPage);
  const approvalResponsePromise = clientPage.waitForResponse(
    (response) => response.url().includes("/api/public/quotes/")
      && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await clientPage.getByRole("button", { name: "Aceptar Cotización y Firmar Electrónicamente" }).click();
  const approvalResponse = await approvalResponsePromise;
  expect(approvalResponse.status()).toBe(200);
  await expect(clientPage.getByRole("heading", { name: "¡Cotización Aprobada!" })).toBeVisible();
  await expect(clientPage.getByText("S/. 170.00", { exact: true })).toBeVisible();
  await clientPage.close();

  await page.goto("/technician");
  await expect(page.getByRole("heading", { name: "Área de Técnico" })).toBeVisible();
  const approvedJobButton = page.getByRole("button").filter({ hasText: plate }).first();
  await expect(approvedJobButton).toBeVisible();
  await approvedJobButton.click();
  await expect(page.getByRole("heading", { name: "Reparación Autorizada" })).toBeVisible();

  await page.getByRole("button", { name: "Iniciar Reparación" }).click();
  await expect(page.getByRole("heading", { name: "Reparación en Curso" })).toBeVisible();
  await page.getByRole("button", { name: "Finalizar Reparación y Enviar a QC" }).click();
  await expect(page.getByText("Vehículo enviado a control de calidad")).toBeVisible();

  await page.goto("/qc");
  await expect(page.getByRole("heading", { name: "Control de Calidad (QC)" })).toBeVisible();
  await expect(page.getByText(`Vehículo: ${plate}`)).toBeVisible();
  await page.getByRole("button", { name: "Rechazar y Devolver a Taller" }).click();
  await page.getByLabel("Motivo del Rechazo / Instrucciones para el Técnico").fill(
    "La prueba E2E detectó un ajuste pendiente antes de aprobar QC.",
  );
  const rejectionResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/jobs/")
      && response.url().endsWith("/qc")
      && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Confirmar Rechazo y Enviar a Técnico" }).click();
  const rejectionResponse = await rejectionResponsePromise;
  expect(rejectionResponse.status()).toBe(200);
  await expect(rejectionResponse.json()).resolves.toMatchObject({ status: "Repair" });

  await page.goto("/technician");
  const repairJobButton = page.getByRole("button").filter({ hasText: plate }).first();
  await expect(repairJobButton).toBeVisible();
  await repairJobButton.click();
  await expect(page.getByRole("heading", { name: "Reparación en Curso" })).toBeVisible();
  await page.getByRole("button", { name: "Finalizar Reparación y Enviar a QC" }).click();
  await expect(page.getByText("Vehículo enviado a control de calidad")).toBeVisible();

  await page.goto("/qc");
  await expect(page.getByText(`Vehículo: ${plate}`)).toBeVisible();
  for (const name of [
    "Síntomas Resueltos",
    "Seguridad y Ajustes Mecánicos",
    "Fluidos y Fugas",
    "Estética y Limpieza",
    "Prueba de Ruta Validada",
  ]) {
    await page.getByRole("switch", { name }).click();
  }
  await page.getByLabel("Notas del Inspector (Opcional)").fill("Todos los controles E2E conformes.");
  const qcApprovalResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/jobs/")
      && response.url().endsWith("/qc")
      && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Aprobar y Marcar Listo para Entrega" }).click();
  const qcApprovalResponse = await qcApprovalResponsePromise;
  expect(qcApprovalResponse.status()).toBe(200);
  await expect(qcApprovalResponse.json()).resolves.toMatchObject({ status: "Ready" });

  await page.goto("/advisor/payments");
  await expect(page.getByRole("heading", { name: "Caja / Pagos" })).toBeVisible();
  const paymentDetails = page.getByRole("button", { name: `Detalles de pago para ${plate}` });
  await expect(paymentDetails).toBeVisible();
  await paymentDetails.click();
  await page.getByRole("button", { name: "Saldo completo" }).click();
  const paymentResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/jobs/")
      && response.url().endsWith("/payments")
      && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Registrar Pago" }).click();
  const paymentResponse = await paymentResponsePromise;
  expect(paymentResponse.status()).toBe(200);
  await expect(paymentResponse.json()).resolves.toMatchObject({
    status: "Delivered",
    totalPaid: 170,
    remainingBalance: 0,
  });
  await expect(paymentDetails.getByText("Entregado", { exact: true })).toBeVisible();
});
