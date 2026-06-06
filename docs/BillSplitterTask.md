# Claude Agent Prompt — Electricity Bill Splitting Feature

## Role
You are a full-stack software engineer agent. Your job is to implement an **Electricity Bill Splitting** feature into an existing property management web application. The app has a tenant portal and an admin console already in place. You will extend both.

Work **file by file, feature by feature**. After each major step, summarise what you built and what comes next. Do not proceed to the next step until the current one compiles and passes basic validation.

---

## Project Discovery (do this first)

Before writing any code, do the following:

1. Scan the project structure and identify:
    - Frontend framework (React / Vue / Next.js / other)
    - Backend framework (Node/Express, Django, Laravel, FastAPI, other)
    - ORM / database layer (Prisma, Sequelize, SQLAlchemy, Eloquent, other)
    - Database engine (PostgreSQL, MySQL, SQLite, MongoDB)
    - Existing auth system and how roles (admin / tenant) are differentiated
    - Where the existing `Properties` tab lives in the admin console
    - Where the existing `Financial` tab lives in the admin console
    - Where the tenant portal dashboard is rendered
    - File upload mechanism already in use (S3, local, Cloudinary, other)
    - State management pattern (Redux, Zustand, Context, Pinia, other)

2. Print a discovery summary in this format before touching any file:
```
DISCOVERY SUMMARY
-----------------
Frontend: [framework + version]
Backend: [framework + version]
ORM: [name]
DB: [engine]
Auth roles found: [admin, tenant, ...]
Properties tab location: [file path]
Financial tab location: [file path]
Tenant portal dashboard: [file path]
File upload mechanism: [name/service]
State management: [pattern]
Existing bill-related models/tables: [list or "none"]
```

3. Ask for confirmation before proceeding if anything is ambiguous.

---

## Phase 1 — Database / Data Model

### 1.1 — Migrations / Schema Changes

Add the following to the existing schema. Use the project's existing migration pattern.

**Modify `Property` table — add:**
```
usc_no            String?   // Electricity meter USC number
ac_rate_per_unit  Decimal   // Default: 9.00 (₹ per AC unit)
```

**Modify `Room` (or `Unit`) table — add:**
```
has_ac  Boolean  // Default: false
```

**Create `ElectricityBill` table:**
```
id                  UUID / auto-increment PK
property_id         FK → Property
bill_month          Date          // Store as first day of that month (YYYY-MM-01)
usc_no              String
present_reading     Integer
previous_reading    Integer
present_date        Date
previous_date       Date
total_units         Integer       // present_reading - previous_reading
total_amount        Decimal(10,2)
bill_image_url      String?
uploaded_by         FK → User
upload_source       Enum: tenant | admin
status              Enum: pending | validated | rejected | split_calculated | locked
rejection_reason    String?
created_at          Timestamp
updated_at          Timestamp
```

**Create `TenantACSubmission` table:**
```
id                    UUID / auto-increment PK
bill_id               FK → ElectricityBill
tenant_id             FK → User
room_id               FK → Room
ac_units_submitted    Integer      // Units entered by tenant
submitted_at          Timestamp
is_admin_override     Boolean      // Default: false
admin_override_value  Integer?
```

**Create `BillSplit` table:**
```
id               UUID / auto-increment PK
bill_id          FK → ElectricityBill
tenant_id        FK → User
room_id          FK → Room
ac_units         Integer       // Final units used (override takes precedence)
ac_charge        Decimal(10,2)
common_share     Decimal(10,2)
total_payable    Decimal(10,2)
locked_at        Timestamp?
```

After writing migrations, run them and confirm the schema is applied before moving to Phase 2.

---

## Phase 2 — Backend: API Endpoints

Implement the following endpoints. Follow the existing API conventions (REST or GraphQL) already present in the project.

### 2.1 — Property Configuration

```
PATCH  /api/admin/properties/:id/electricity-config
  Body: { usc_no: string, ac_rate_per_unit: number }
  Auth: admin only
  Action: Update usc_no and ac_rate_per_unit on the property

PATCH  /api/admin/rooms/:id/ac-status
  Body: { has_ac: boolean }
  Auth: admin only
  Action: Update has_ac on the room
```

### 2.2 — Bill Upload

```
POST  /api/bills/upload
  Body: multipart/form-data { image: File, property_id: string, bill_month: string }
  Auth: tenant or admin
  Action:
    - If upload_source = tenant: check if a non-rejected bill already exists for
      that property + bill_month. If yes, return 409 { message: "Bill already uploaded" }
    - Store image via existing file upload mechanism
    - Create ElectricityBill record with status = "pending"
    - Return created bill record

GET  /api/bills/status?property_id=&bill_month=
  Auth: tenant (scoped to their property) or admin
  Action: Return { status, uploaded_by_name, uploaded_at } for that property+month
```

### 2.3 — Bill Validation (admin)

```
POST  /api/admin/bills/:id/validate
  Auth: admin only
  Action (run all checks server-side):
    1. USC No. check — bill.usc_no must match property.usc_no
       Fail → set status = "rejected", rejection_reason = "USC No. mismatch"
    2. Period check — bill.previous_date must match present_date of the last
       validated bill for this property (skip if first bill)
       Fail → status = "rejected", rejection_reason = "Period mismatch"
    3. Units consistency — (present_reading - previous_reading) must equal
       total_units within ±1 tolerance
       Fail → status = "rejected", rejection_reason = "Unit count inconsistency"
    All pass → status = "validated"
  Return: { status, rejection_reason? }

POST  /api/admin/bills/:id/reject
  Body: { reason: string }
  Auth: admin only
  Action: set status = "rejected", rejection_reason = reason
```

### 2.4 — AC Unit Submission (tenant)

```
POST  /api/bills/:bill_id/ac-units
  Body: { ac_units_submitted: number }
  Auth: tenant (must be a tenant of the property this bill belongs to)
  Action:
    - Upsert TenantACSubmission for (bill_id, tenant_id, room_id)
    - Only allowed while bill status is "validated" (not yet locked)
  Return: created/updated submission

GET  /api/bills/:bill_id/ac-units
  Auth: tenant (own submission) or admin (all submissions)
  Return: list of TenantACSubmission for this bill
```

### 2.5 — Splitting Logic (admin)

```
POST  /api/admin/bills/:id/calculate-split
  Auth: admin only
  Precondition: bill.status must be "validated"
  Action:
    1. Fetch all rooms for the property
    2. Fetch all TenantACSubmission for this bill
    3. For each room with has_ac = true:
         ac_units = admin_override_value ?? ac_units_submitted ?? 0
         ac_charge = ac_units × property.ac_rate_per_unit
    4. total_ac_charge = sum of all ac_charges
    5. common_pool = bill.total_amount - total_ac_charge
    6. total_rooms = count of rooms in the property
    7. raw_common_share = common_pool / total_rooms
       Round each share DOWN to 2 decimal places
       residual = common_pool - (raw_common_share × total_rooms)
       Add residual to the first tenant alphabetically by name
    8. Upsert BillSplit rows for each tenant
    9. Set bill.status = "split_calculated"
  Return: array of BillSplit records

PATCH  /api/admin/bills/:id/ac-override
  Body: { tenant_id: string, ac_units: number }
  Auth: admin only
  Action: Set is_admin_override = true, admin_override_value = ac_units on TenantACSubmission
  (Re-run calculate-split after this)

POST  /api/admin/bills/:id/lock
  Auth: admin only
  Precondition: bill.status must be "split_calculated"
  Action:
    - Set status = "locked", locked_at = now() on all BillSplit rows
    - Set bill.status = "locked"
    - Trigger notification to each tenant (use existing notification mechanism)
  Return: { success: true }

GET  /api/admin/bills/:id/split-summary
  Auth: admin only
  Return: full split table — tenant name, room, ac_units, ac_charge, common_share,
          total_payable, unattributed_units (total_units - sum of all ac_units)
```

### 2.6 — Tenant: View Own Split

```
GET  /api/tenant/bills/current-split
  Auth: tenant
  Action: Return their BillSplit record for the current month's locked bill
          for their property, including a read-only summary table (all tenants'
          total_payable only — not their ac_units)
```

---

## Phase 3 — Admin Console: UI Changes

### 3.1 — Properties Tab

**In each property's settings/detail page:**

Add an "Electricity Configuration" section card with:
- Text input: `USC No. (Electricity Meter)` — shows current value, inline save button
- Decimal input: `AC Rate (₹ per unit)` — default 9.00, inline save
- On save, call `PATCH /api/admin/properties/:id/electricity-config`

**In the rooms/units listing within a property:**

Add a column `AC Installed` with a toggle switch per row (Yes/No).
- On toggle, call `PATCH /api/admin/rooms/:id/ac-status`
- Show a small AC icon (use existing icon library) next to rooms where `has_ac = true`

### 3.2 — Financial Tab → Electricity Bills Section

**Bills list view** — table with columns:
`Property | Bill Month | USC No. | Units | Total Amount | Uploaded By | Source | Status | Actions`

Status badges:
- `pending` → yellow
- `validated` → blue
- `rejected` → red (show rejection reason on hover/tooltip)
- `split_calculated` → purple
- `locked` → green

**Actions per row:**
- `pending` → [Validate] [Reject]
- `validated` → [View AC Submissions] [Calculate Split] [Reject]
- `split_calculated` → [Edit AC Units] [Lock Bill]
- `locked` → [View Summary] [Download PDF]

**Manual upload flow:**
- Button: `+ Upload Bill`
- Modal with: property selector dropdown, month picker, image upload, manual entry fields (USC No., present/previous reading, present/previous date, total amount)
- On submit, auto-run validation server-side and show result inline in the modal

**Split summary view (drawer/modal):**
- Table: Tenant | Room | AC | AC Units | AC Charge (₹) | Common Share (₹) | **Total Payable (₹)**
- Footer row: unattributed units callout — `196 units not attributed to any room — absorbed into common pool`
- Editable AC units column (admin override) with a pencil icon per cell
- [Recalculate] button after edits
- [Lock Bill] button — disabled until at least one split row exists

### 3.3 — Pending Validation Queue

Add a badge count on the Financial tab showing the number of bills in `pending` status.
On the bills list, default filter to `pending` so admin sees the queue first.

---

## Phase 4 — Tenant Portal: UI Changes

### 4.1 — Monthly AC Units Card

On the tenant dashboard, add a card titled `AC Units — [Month Year]`:
- If bill for this month is not yet locked: show numeric input + [Submit] button
- If already submitted but not locked: show submitted value with [Edit] option
- If bill is locked: show submitted value as read-only, labelled `Submitted`
- If tenant's room has `has_ac = false`: hide this card entirely

### 4.2 — Upload Electricity Bill Card

On the tenant dashboard, add a card titled `Electricity Bill — [Property Name]`:
- Button: `Upload Bill for [Month Year]`
    - Opens a file picker (image/PDF)
    - On select, uploads to `POST /api/bills/upload`
    - Show upload progress
- Once uploaded (by this tenant or any other tenant of the same property):
    - Replace button with disabled state: `Bill already uploaded for [Month Year]`
    - Show: `Uploaded by [Name] on [Date]`
- If bill was rejected: show `Bill was rejected: [reason]` in red + re-enable the upload button

### 4.3 — My Bill Share Card

On the tenant dashboard, add a card titled `My Electricity Share — [Month Year]`:
- Only visible once bill is `locked`
- Shows: AC Charge + Common Share + **Total Payable** (large, prominent)
- Expandable section: read-only table of all tenants in the property showing only their `total_payable` (not ac_units)
- If bill not yet locked: show `Pending — bill is being processed`

---

## Phase 5 — Splitting Logic (reference implementation)

Use this exact algorithm when implementing `calculate-split`:

```javascript
function calculateSplit(bill, rooms, acSubmissions, acRatePerUnit) {
  const totalRooms = rooms.length;
  let totalACCharge = 0;
  const splits = [];

  for (const room of rooms) {
    const submission = acSubmissions.find(s => s.room_id === room.id);
    const acUnits = room.has_ac
      ? (submission?.admin_override_value ?? submission?.ac_units_submitted ?? 0)
      : 0;
    const acCharge = parseFloat((acUnits * acRatePerUnit).toFixed(2));
    totalACCharge += acCharge;
    splits.push({ room, tenant: room.tenant, acUnits, acCharge });
  }

  const commonPool = parseFloat((bill.total_amount - totalACCharge).toFixed(2));
  const rawShare = Math.floor((commonPool / totalRooms) * 100) / 100;
  const residual = parseFloat((commonPool - rawShare * totalRooms).toFixed(2));

  // Sort alphabetically; first tenant absorbs residual
  splits.sort((a, b) => a.tenant.name.localeCompare(b.tenant.name));
  splits[0].commonShare = parseFloat((rawShare + residual).toFixed(2));
  for (let i = 1; i < splits.length; i++) splits[i].commonShare = rawShare;

  for (const s of splits) {
    s.totalPayable = parseFloat((s.acCharge + s.commonShare).toFixed(2));
  }

  const unattributedUnits = bill.total_units - splits.reduce((sum, s) => sum + s.acUnits, 0);
  return { splits, totalACCharge, commonPool, unattributedUnits };
}
```

---

## Phase 6 — Validation & Edge Cases

Handle these explicitly in both backend and UI:

| Scenario | Behaviour |
|---|---|
| Tenant submits AC units after bill is locked | API returns 403: `Bill is already locked` |
| Two tenants upload bill simultaneously | Second upload returns 409: `Bill already uploaded` (use DB unique constraint on property_id + bill_month) |
| USC No. not configured for property | Validation step 1 always fails; show admin a warning to configure USC No. in Properties tab |
| No AC submissions received before admin calculates split | Proceed with ac_units = 0 for all; show a warning banner listing which tenants haven't submitted |
| Bill total_amount is 0 or negative | Reject at upload with: `Invalid bill amount` |
| First bill for a property (no previous bill to compare dates) | Skip period check; pass validation if USC No. and units checks pass |
| Admin re-uploads after rejection | Create a new bill record; do not overwrite the rejected one |

---

## Phase 7 — Testing Checklist

After implementation, verify all of the following manually or with test scripts:

- [ ] Admin can set USC No. and AC rate on a property
- [ ] Admin can toggle AC status per room
- [ ] Tenant can upload a bill image; second tenant sees "already uploaded"
- [ ] Bill with wrong USC No. is rejected with correct reason
- [ ] Bill with mismatched period is rejected with correct reason
- [ ] Bill with inconsistent unit count is rejected with correct reason
- [ ] Valid bill transitions to `validated`
- [ ] Tenant with AC room can submit AC units
- [ ] Tenant without AC room does not see the AC submission card
- [ ] Admin can override AC units per tenant
- [ ] Split calculation matches the reference algorithm exactly
- [ ] Residual paisa is allocated to first tenant alphabetically
- [ ] Locking the bill prevents further AC unit edits
- [ ] Tenant sees correct total payable after lock
- [ ] Tenant cannot see other tenants' AC unit counts
- [ ] Unattributed units appear in the summary but are not charged separately

---

## Output Format per Phase

After completing each phase, output:

```
PHASE [N] COMPLETE
------------------
Files created:    [list]
Files modified:   [list]
Migrations run:   [yes/no]
Tests passing:    [yes/no/skipped]
Known issues:     [list or "none"]
Next phase:       [phase name]
```

Do not proceed to the next phase until this block is printed and confirmed.

---

## Constraints

- Do not modify any existing authentication logic
- Do not change existing database tables beyond the additive columns specified
- Follow the existing code style, naming conventions, and folder structure exactly
- Use the existing file upload mechanism — do not introduce a new one
- Use the existing notification system for bill-locked alerts — do not introduce a new one
- All monetary values must use `Decimal` / `numeric` types in the DB — never `float`
- All API responses must follow the existing response envelope format of the project