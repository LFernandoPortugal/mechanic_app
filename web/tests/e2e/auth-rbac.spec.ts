import { expect, test, type Page } from "@playwright/test";

const fixturePassword = "FixturePassword123!";

async function signIn(page: Page, email: string) {
  await page.getByLabel("Correo Electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(fixturePassword);
  await page.getByRole("button", { name: "Iniciar Sesión" }).click();
}

async function switchUser(page: Page, email: string, destination: string) {
  await page.getByRole("button", { name: "Cerrar Sesión" }).click();
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await page.goto(`/login?redirect=${encodeURIComponent(destination)}`);
  await signIn(page, email);
  await expect(page).toHaveURL(new URL(destination, page.url()).toString());
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

async function waitForVisualReady(page: Page, theme: "light" | "dark") {
  await page.locator(".animate-spin").first().waitFor({ state: "detached", timeout: 20_000 }).catch(() => {});
  if (await page.locator("html").getAttribute("data-theme") !== theme) {
    await page.getByRole("button", { name: `Tema: ${theme}` }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme, { timeout: 20_000 });
  await page.waitForTimeout(150);
}

test("the public entry presents the product and redirects to login", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Del ingreso a la entrega, cada orden bajo control." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Flujo operativo" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("login-industrial-light-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Cambiar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: testInfo.outputPath("login-industrial-dark-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Correo Electrónico")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("login-industrial-dark-mobile.png"), fullPage: true });
});

test("an ADMIN returns to the protected destination and opens user management", async ({ page }) => {
  await page.goto("/inventory");
  await expect(page).toHaveURL(/\/login\?redirect=%2Finventory$/);

  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();

  await page.getByRole("link", { name: "Empleados" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "Gestión de Usuarios" })).toBeVisible();
  await expect(page.getByText("4 usuarios registrados")).toBeVisible();
});

test("the ADMIN dashboard supports both themes and mobile navigation", async ({ page }, testInfo) => {
  await page.goto("/login?redirect=%2F");
  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Resumen operativo" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "El taller aún no tiene órdenes" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard-light-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Tema: dark" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath("dashboard-dark-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Tema: light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();
  await page.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("dialog", { name: "Más" })).toBeVisible();
  await page.getByRole("dialog", { name: "Más" }).getByRole("link", { name: "Ayuda" }).click();
  await expect(page).toHaveURL(/\/help$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Trabaja con claridad en cada etapa" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Operaciones destructivas" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard-light-mobile.png"), fullPage: true });
});

test("the complete route set renders in desktop and mobile across both themes", async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const adminRoutes = [
    ["home", "/"],
    ["reception", "/reception"],
    ["technician", "/technician"],
    ["advisor", "/advisor"],
    ["qc", "/qc"],
    ["payments", "/advisor/payments"],
    ["inventory", "/inventory"],
    ["clients", "/clients"],
    ["client-detail", "/clients/detail"],
    ["employees", "/admin/users"],
    ["settings", "/admin/settings"],
    ["analytics", "/analytics"],
    ["help", "/help"],
  ] as const;

  await page.goto("/login?redirect=%2F");
  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/$/);

  for (const [name, route] of adminRoutes) {
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate((value) => localStorage.setItem("app-theme", value), theme);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible({ timeout: 20_000 });
      await waitForVisualReady(page, theme);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-desktop.png`), fullPage: true });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible({ timeout: 20_000 });
      await waitForVisualReady(page, theme);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}-mobile.png`), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Cerrar Sesión" }).click();
  await page.goto("/login");
  await page.screenshot({ path: testInfo.outputPath("login-light-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath("login-light-desktop.png"), fullPage: true });

  await page.goto("/quote/view");
  await expect(page.getByRole("heading", { name: "Cotización no Encontrada" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("quote-invalid-light-desktop.png"), fullPage: true });

  await page.goto("/expired");
  await page.screenshot({ path: testInfo.outputPath("expired-light-mobile.png"), fullPage: true });
});

test("the SUPER_ADMIN workspace renders on desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/login?redirect=%2Fsuper-admin");
  await signIn(page, "super-admin.e2e@example.com");
  await expect(page).toHaveURL(/\/super-admin$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Panel del Creador" })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: testInfo.outputPath("super-admin-light-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("super-admin-light-mobile.png"), fullPage: true });
});

test("an ADMIN creates, edits, and completely deletes workshop staff", async ({ page }, testInfo) => {
  const email = `staff-${testInfo.retry}@e2e.example.com`;
  await page.goto("/login?redirect=%2Fadmin%2Fusers");
  await signIn(page, "admin.e2e@example.com");
  await expect(page).toHaveURL(/\/admin\/users$/);

  await page.locator("#new-user-name").fill("Personal E2E");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña temporal").fill("TemporaryStaff123!");
  await page.getByRole("button", { name: "Técnico para nuevo usuario" }).click();
  await page.getByRole("button", { name: "Recepción para nuevo usuario" }).click();

  const createResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/workshop/users")
      && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Crear usuario" }).click();
  expect((await createResponsePromise).status()).toBe(201);
  await expect(page.getByText("5 usuarios registrados")).toBeVisible();

  const nameInput = page.getByLabel(`Nombre de ${email}`);
  const userCard = nameInput.locator("xpath=ancestor::*[@data-slot='card'][1]");
  await expect(userCard.getByText(email)).toBeVisible();
  await nameInput.fill("Personal E2E Editado");
  await userCard.getByRole("button", { name: "Asesor para Personal E2E" }).click();
  const updateResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/workshop/users")
      && response.request().method() === "PATCH",
  );
  await userCard.getByRole("button", { name: "Guardar usuario Personal E2E" }).click();
  expect((await updateResponsePromise).status()).toBe(200);
  await expect(nameInput).toHaveValue("Personal E2E Editado");

  page.once("dialog", (dialog) => dialog.accept());
  const deleteResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/workshop/users")
      && response.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: "Eliminar a Personal E2E Editado" }).click();
  expect((await deleteResponsePromise).status()).toBe(200);
  await expect(page.getByText("4 usuarios registrados")).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0);

  const authResponse = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-mechanic-app/accounts:batchGet?key=e2e-api-key",
    { headers: { Authorization: "Bearer owner" } },
  );
  const authUsers = await authResponse.json() as { users?: Array<{ email?: string }> };
  expect(authUsers.users?.map((user) => user.email) || []).not.toContain(email);
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

test("minimum-role users take a signed reception through delivery", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const plate = `E2E-${401 + testInfo.retry}`;

  await page.goto("/login");
  await signIn(page, "reception.e2e@example.com");
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

  await switchUser(page, "technician.e2e@example.com", "/technician");
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

  await switchUser(page, "advisor.e2e@example.com", "/advisor");
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

  await switchUser(page, "technician.e2e@example.com", "/technician");
  await expect(page.getByRole("heading", { name: "Área de Técnico" })).toBeVisible();
  const approvedJobButton = page.getByRole("button").filter({ hasText: plate }).first();
  await expect(approvedJobButton).toBeVisible();
  await approvedJobButton.click();
  await expect(page.getByRole("heading", { name: "Reparación Autorizada" })).toBeVisible();

  await page.getByRole("button", { name: "Iniciar Reparación" }).click();
  await expect(page.getByRole("heading", { name: "Reparación en Curso" })).toBeVisible();
  await page.getByRole("button", { name: "Finalizar Reparación y Enviar a QC" }).click();
  await expect(page.getByText("Vehículo enviado a control de calidad")).toBeVisible();

  await switchUser(page, "advisor.e2e@example.com", "/qc");
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

  await switchUser(page, "technician.e2e@example.com", "/technician");
  const repairJobButton = page.getByRole("button").filter({ hasText: plate }).first();
  await expect(repairJobButton).toBeVisible();
  await repairJobButton.click();
  await expect(page.getByRole("heading", { name: "Reparación en Curso" })).toBeVisible();
  await page.getByRole("button", { name: "Finalizar Reparación y Enviar a QC" }).click();
  await expect(page.getByText("Vehículo enviado a control de calidad")).toBeVisible();

  await switchUser(page, "advisor.e2e@example.com", "/qc");
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
