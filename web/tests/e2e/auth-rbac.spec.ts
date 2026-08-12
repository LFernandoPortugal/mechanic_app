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
