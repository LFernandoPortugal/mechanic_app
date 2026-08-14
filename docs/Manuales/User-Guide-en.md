# SGA Mechanic App — User Guide

> Functional baseline: production commit `280418a`, 2026-08-14.
> The official web app is deployed to Vercel from `main`.

This guide contains no passwords, quote tokens, real account details, service credentials, or `.env` values.

## Canonical workflow

```text
Reception → Diagnosis → Approval → Approved → Repair → QC → Ready → Delivered
```

Do not skip customer approval, quality control, or the payment condition required for delivery.

## SUPER_ADMIN

SUPER_ADMIN is the unique cross-workshop role. It is not a routine test account.

### Create a workshop and its first ADMIN

1. Open `/super-admin`.
2. Enter a unique lowercase workshop ID using letters, numbers, and hyphens.
3. Enter the workshop name and ADMIN email.
4. Set a 12–128 character initial password.
5. Select the trial duration.
6. Review the workshop ID, email, and duration, then select **Create Workshop and Account** once.

The server coordinates the Firebase Authentication account, workshop settings, and Firestore user profile. If the email or workshop already exists, it returns a conflict and does not merge identities.

Share the initial password through a private channel. Ask the ADMIN to use **Forgot my password** to establish their own password. Passwords are not stored in Firestore.

### Read the reconciliation audit

- **Consistent:** Auth account, profile, and workshop agree; no action needed.
- **Auth only:** investigate why the profile is missing before deleting anything.
- **Profile only:** investigate an interrupted removal and retry only with evidence.
- **Missing workshop:** confirm the tenant; never reassign automatically.

### Trials and access

- **+7d / +30d** extends the current expiration; an expired trial restarts from now.
- **Revoke** expires access immediately but preserves accounts, profiles, settings, and operational data.
- Extending the trial restores access after authorization.

### Danger Mode

**Danger On** temporarily allows the workshop ADMIN to reset operational data and enables protected inventory deletion where applicable. It does not delete anything by itself. Enable it for an approved operation, verify the result, then return it to **Danger Off**.

### Destructive operations

- **Delete data:** removes public quote links, jobs, inventory, and inventory movements. It keeps workshop settings, Auth accounts, user profiles, and roles.
- **Delete user:** removes the selected Auth account, then its Firestore profile. It does not erase historical job records.
- **Delete workshop:** removes workshop Auth accounts first, then quote links, operational data, profiles, and settings.

If account deletion fails during a workshop removal, the server retains settings and data with a pending marker so the same operation can be retried. Do not perform a manual partial cleanup.

## Workshop owner / ADMIN

### First access and settings

Sign in at `/login` and use **Forgot my password** to replace or recover the initial password. In `/admin/settings`, maintain the public business name, tax ID, phone, address, currency symbol, tax name/rate, logo, and demo mode.

ADMIN cannot edit trial expiration, disabled state, or reset permission.

### Employees

In `/admin/users`:

1. enter name, email, and a temporary password of at least 12 characters;
2. select at least one operational role;
3. create the account once and wait for confirmation;
4. share the initial password privately and ask the employee to reset it.

ADMIN may edit names and operational roles, but not UID, email, tenant, or SUPER_ADMIN. ADMIN cannot delete their own account or remove the workshop's last ADMIN.

Removing an employee deletes both their Auth account and profile. If the operation fails, refresh and retry the same removal; do not immediately recreate the email.

### Inventory

ADMIN may create and edit items, register auditable IN/OUT/ADJUSTMENT movements, and view movement history. Item deletion requires temporary Danger Mode. Unlimited-stock services do not accept artificial stock movements.

### Reset workshop data

The danger zone appears only after SUPER_ADMIN grants reset permission. Typing `ELIMINAR` confirms deletion of quote links, jobs, inventory, and movements. Users, roles, credentials, and settings remain.

Do not use this for daily cleanup, a single incorrect job, or employee access removal.

## RECEPTION

Route: `/reception`.

1. Enter required plate, make, and customer name.
2. Add VIN, model, color, vehicle type, phone, and email when available.
3. Record odometer, fuel, symptoms, fluids, and valuables.
4. Add no more than four relevant prior-damage photos.
5. Explain the custody transfer and obtain the reception signature.
6. Submit once and wait for confirmation.

The reception signature is not customer quote approval. Invalid images, originals over 15 MB, or oversized signatures are rejected before the job is written.

## TECHNICIAN

Routes: `/technician` and `/qc`.

### Diagnosis

Select a received job, review the entry evidence, and record at least one inspection finding. Assign a clear status and notes to each finding. Submit to `Approval`; an empty diagnosis cannot advance.

### Repair

After the customer approves, start the `Approved` job so it enters `Repair`. Work only on approved items and keep declined items documented. When complete, send the job to `QC`.

### QC participation

Complete all five checks to pass. A rejection requires a specific reason and returns the job to `Repair`. A completed payment never bypasses QC.

## ADVISOR

Routes: `/advisor`, `/advisor/payments`, `/qc`, `/inventory`, and `/clients`.

### Quote and public link

1. Open a job in `Approval`.
2. Review technician findings.
3. Assign item prices and labor.
4. Verify currency, tax, and total.
5. Save and generate the secure public link.
6. Verify recipient and vehicle before sending it.

Prices are editable only in `Approval`. The current link uses `/quote/view?id=JOB_ID#token=TOKEN`, expires after 30 days, and remains available for the progress tracker through `Delivered`.

- **Regenerate** invalidates the previous link and creates a new secret.
- **Revoke public link** blocks access without deleting the job.
- Never paste the token into public tickets or documentation.

### Customer decision

The customer may approve all, some, or none of the quoted items and must provide a separate approval signature. The server recalculates the approved amount and records declined items. Do not replace the approved amount with payment totals.

### QC and payments

QC requires all five checks to pass or a reason to fail. Passing sends the job to `Ready`, or directly to `Delivered` if the approved amount was already fully paid.

For payment, review the approved total, recorded payments, and current balance. Enter amount, method, and reference. Partial payments do not deliver a job. Cash may exceed the balance to calculate change; other methods may not. A payment delivers only a job already in `Ready`.

If the server reports a balance conflict, refresh and verify existing payments before retrying.

ADVISOR has read-only inventory access.

## End-to-end state guide

| State | Primary actor | Required result |
|---|---|---|
| Reception | RECEPTION | Signed intake with evidence |
| Diagnosis | TECHNICIAN | At least one documented finding |
| Approval | ADVISOR | Saved quote and secure link |
| Approved | Customer | Item decisions and approval signature |
| Repair | TECHNICIAN | Approved work completed |
| QC | TECHNICIAN / ADVISOR | Five-check pass or reasoned rejection |
| Ready | System / ADVISOR | Outstanding balance completed |
| Delivered | System | QC passed and balance is zero |

Allowed variants include partial approval, QC rejection back to Repair, full payment before QC, and partial payments after QC. Direct Approval-to-Ready, Repair-to-Delivered, post-approval price edits, direct Firestore payments, and direct QC state writes are not allowed.

## Delete data vs revoke access vs delete workshop

| Action | Access | Operational data | Users and roles | Settings | Reversible |
|---|---|---|---|---|---|
| Revoke access | Stops | Kept | Kept | Kept | Yes, by extending the trial |
| Delete data | Continues | Deleted | Kept | Kept | No |
| Delete workshop | Removed | Deleted | Auth accounts and profiles deleted | Deleted | No |

If you cannot clearly state what must remain, do not confirm the action.

## Access recovery and common errors

- **Forgot password:** enter the email on `/login`, then select **Forgot my password**. The app returns a neutral message whether or not the account exists.
- **User not registered:** Auth and Firestore may be inconsistent. Refresh, ask SUPER_ADMIN to inspect reconciliation read-only, and do not duplicate the email.
- **Trial expired:** SUPER_ADMIN must verify the workshop and extend the trial when authorized. Expiration does not delete data.
- **Session expired during QC/payment:** the app retries token renewal once, saves the same-tab draft for up to 30 minutes, and returns to login. Recheck current job state before resubmitting.
- **Unexpected empty/error list:** use **Reconnect**, **Refresh**, or **Synchronize** where available. Do not recreate data until the first operation's result is known.
- **Payment conflict:** refresh payments and balance, then retry only if the payment is absent.
- **Public link returns 404:** the token may be missing, wrong, expired, regenerated, or revoked. ADVISOR should verify the job and issue a new link if appropriate.
- **Reception evidence rejected:** recapture an oversized signature, keep no more than four necessary photos, or replace an invalid/oversized image.
- **Deletion left pending:** synchronize, confirm the exact UID/workshop ID, and retry the same coordinated operation. Do not manually delete Firestore documents.

Support tickets should include route, role, workshop/job ID when relevant, time and timezone, action, visible message, and whether the result appears after refresh. Never include passwords, quote tokens, cookies, secrets, or unnecessary personal data.

> Destructive engineering tests must use Firebase Auth/Firestore Emulator and `demo-mechanic-app`. The official web application is hosted on Vercel, not Firebase Hosting.
