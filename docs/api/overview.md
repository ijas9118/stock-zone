# Server Actions Reference

StockZone uses Next.js Server Actions as its data layer. There is no REST API — all data operations happen through these typed server-side functions.

## Conventions

### Authentication

Every action begins with an auth check. There are two patterns:

```typescript
// Admin-only actions
await verifyAdmin();
// Throws "Unauthorized" if not authenticated
// Throws "Forbidden: Admin access required" if not admin

// Permission-based actions (stock movements)
const userId = await verifyUserPermission("sale");
// Throws if not authenticated
// Admins bypass permission checks
// Users must have perm_do_sale = true
```

### Return types

All mutation actions return a discriminated union:

```typescript
{
  success: true;
}
// or
{
  error: string;
}
```

All read actions return typed data or throw an error.

### Caching

Read actions use `unstable_cache` with tags. See [Caching Reference](../development/caching.md).

## Modules

- [Categories](#categories)
- [Products](#products)
- [Shops](#shops)
- [Stock](#stock)
- [Stock Movements](#stock-movements)
- [Units of Measure](#units-of-measure)
- [Users](#users)
- [Warehouses](#warehouses)
- [User Stock (user-facing)](#user-stock)

## Categories

**File:** `src/actions/admin/categories.ts`

### `getCategories(params?)`

Returns a paginated list of categories.

```typescript
const { categories, totalCount } = await getCategories({
  query?: string,    // search by name or code
  page?: number,     // default: 1
  pageSize?: number, // default: 8
});
```

### `createCategory(data)`

```typescript
await createCategory({
  cat_code: string,       // max 10 chars
  category_name: string,
  description?: string,
});
```

### `updateCategory(id, data)`

```typescript
await updateCategory(id, {
  cat_code?: string,
  category_name?: string,
  description?: string,
});
```

### `deleteCategory(id)`

Permanently deletes. Will fail if products are linked to this category (FK constraint).

### `getSubcategories(params?)`

```typescript
const { subcategories, totalCount } = await getSubcategories({
  query?: string,
  categoryId?: string, // filter by parent category
  page?: number,
  pageSize?: number,
});
```

### `createSubcategory` / `updateSubcategory` / `deleteSubcategory`

Same pattern as categories. Subcategories require a `category_id`.

## Products

**File:** `src/actions/admin/products.ts`

### `getProducts(params?)`

```typescript
const { products, totalCount } = await getProducts({
  query?: string,        // search name, SKU, brand
  categoryId?: string,
  subCategoryId?: string,
  page?: number,
  pageSize?: number,
});
```

Returns `ProductWithDetails[]` — includes joined `categories`, `subcategories`, `units_of_measure`, and `profiles` (creator).

### `createProduct(data)`

```typescript
await createProduct({
  name: string,
  sku?: string,
  description?: string,
  brand?: string,
  category: string,      // category UUID
  sub_category?: string, // subcategory UUID
  uom: string,           // unit of measure UUID
  is_active?: boolean,   // default: true
});
```

### `updateProduct(id, data)` / `deleteProduct(id)`

Same field signature as create. Delete is permanent.

## Shops

**File:** `src/actions/admin/shops.ts`

### `getShops(params?)` / `createShop(data)` / `updateShop(id, data)` / `deleteShop(id)`

```typescript
const { shops, totalCount } = await getShops({
  query?: string,
  page?: number,
  pageSize?: number,
});

await createShop({ name: string, description?: string });

await updateShop(id, {
  name?: string,
  description?: string,
  is_active?: boolean,
});
```

## Stock

**File:** `src/actions/admin/stock.ts`

### `getStocks(params?)`

```typescript
const { stocks, totalCount } = await getStocks({
  warehouseId?: string,
  shopTypeId?: string,
  categoryId?: string,
  subCategoryId?: string,
  query?: string,    // search product name or SKU
  page?: number,
  pageSize?: number,
});
```

Returns `StockWithDetails[]` — includes joined product (with category/subcategory), warehouse, and shop type.

### `processStockMovement(data)`

The core stock mutation. Creates a ledger entry and updates the stock snapshot.

```typescript
await processStockMovement({
  productId: string,
  warehouseId: string,
  shopTypeId: string,
  quantityDelta: number,      // positive = add, negative = subtract
  type: StockMovementType,    // 'adjustment' | 'purchase' | 'sale' | 'return' | 'initial_stock' | 'transfer_in' | 'transfer_out'
  notes?: string,
  referenceId?: string,       // links to stock_adjustments or stock_transfers
});
```

Returns `{ error: string }` if stock would go below zero or initial stock already exists.

Invalidates: `admin:stocks`, `admin:stock-movements`, `admin:dashboard`.

### `transferStock(data)`

Orchestrates a warehouse-to-warehouse transfer by calling `processStockMovement` twice.

```typescript
await transferStock({
  productId: string,
  sourceWarehouseId: string,
  destWarehouseId: string,
  shopTypeId: string,
  quantity: number,           // must be positive
  notes?: string,
});
```

Creates a `stock_transfers` record and two movements (`transfer_out` + `transfer_in`). If either movement fails, the transfer is marked as `rejected`.

## Stock Movements

**File:** `src/actions/admin/stock-movements.ts`

### `getStockMovements(params?)`

```typescript
const { movements, totalCount } = await getStockMovements({
  type?: string,         // movement type filter
  warehouseId?: string,
  shopTypeId?: string,
  productQuery?: string, // search product name or SKU
  dateFrom?: string,     // ISO date string
  dateTo?: string,
  page?: number,
  pageSize?: number,
});
```

### `getStockMovementById(id)`

Returns a single `StockMovementWithDetails` or `null`. Not cached — always fresh.

## Units of Measure

**File:** `src/actions/admin/uom.ts`

### `getUnitsOfMeasure(params?)` / `createUnitOfMeasure(data)` / `updateUnitOfMeasure(id, data)` / `deleteUnitOfMeasure(id)`

```typescript
await createUnitOfMeasure({
  uom_code: string,   // max 10 chars, e.g. "KG"
  full_name: string,  // e.g. "Kilogram"
  example?: string,   // e.g. "Weight"
});
```

## Users

**File:** `src/actions/admin/users.ts`

### `getUsers(params?)`

```typescript
const { users, totalCount } = await getUsers({
  query?: string,       // search name or email
  shopTypeId?: string,  // filter by shop assignment ("none" = unassigned)
  page?: number,
  pageSize?: number,
});
```

Returns `ProfileWithShopType[]` — includes `profile_shop_types` with nested `shop_types`.

### `getUserById(userId)` / `getShopTypes()`

Single-record and dropdown fetches. `getShopTypes` is cached with `admin:shop-types`.

### `updateUserStatus(userId, status)` / `updateUserRole(userId, role)`

```typescript
await updateUserStatus(userId, "active"); // "pending" | "active" | "inactive" | "rejected"
await updateUserRole(userId, "admin"); // "admin" | "manager" | "user"
```

### `updateUserShopTypes(userId, shopTypes)`

Replaces all shop assignments for a user (delete + insert).

```typescript
await updateUserShopTypes(userId, [
  { shopTypeId: string, accessLevel: "read_only" | "write" },
]);
```

### `updateUserPermissions(userId, permissions)`

```typescript
await updateUserPermissions(userId, {
  perm_stock_read_all?: boolean,
  perm_stock_own_shop?: boolean,
  perm_add_products?: boolean,
  perm_do_transfer?: boolean,
  perm_do_adjustment?: boolean,
  perm_do_purchase?: boolean,
  perm_do_sale?: boolean,
  perm_do_return?: boolean,
});
```

## Warehouses

**File:** `src/actions/admin/warehouses.ts`

### `getWarehouses(params?)` / `createWarehouse(data)` / `updateWarehouse(id, data)` / `deleteWarehouse(id)`

```typescript
await createWarehouse({
  name: string,
  location?: string,
  description?: string,
});

await updateWarehouse(id, {
  name?: string,
  location?: string,
  description?: string,
  is_active?: boolean,
});
```

## User Stock

**File:** `src/actions/user/stock.ts`

These actions are used by the user-facing inventory views. They respect shop assignments and `perm_stock_read_all`.

### `getUserStocks(params?)`

```typescript
const { stocks, totalCount } = await getUserStocks({
  shopTypeId?: string,
  warehouseId?: string,
  query?: string,
  page?: number,
  pageSize?: number,
});
```

Automatically filters to the user's assigned shops unless `perm_stock_read_all` is true.

### `getUserStockById(stockId)`

Single stock record with full product, warehouse, and shop joins.

### `getMyProfile()`

Returns the current user's full profile including shop assignments.

### `getMyAssignedShops()`

Returns a simplified list of `{ id, name, accessLevel }` for the current user's assigned shops.
