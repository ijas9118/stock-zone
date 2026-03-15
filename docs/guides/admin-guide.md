# Admin Guide

This guide covers everything an administrator needs to manage the StockZone system — from approving users to processing stock movements.

## Accessing the admin panel

After logging in with an admin account, you are automatically redirected to `/admin`. The sidebar provides navigation to all admin sections.

## Dashboard

The dashboard at `/admin` gives a real-time snapshot of your operation:

| Section            | What it shows                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| Stat cards (row 1) | Total users, products, warehouses, and shop types                          |
| Stat cards (row 2) | Total inventory items, low stock alerts, 30-day movement count, categories |
| Movement Breakdown | Bar chart of movement types over the last 30 days                          |
| Movement Volume    | Area chart of inbound vs outbound movements over 14 days                   |
| Recent Movements   | Latest 8 stock movements with quick links to detail views                  |
| Top Stocked        | Top 6 products by total quantity, with per-location breakdown on hover     |
| Recent Users       | Last 5 registered accounts with status badges                              |

The dashboard refreshes automatically every 5 minutes. After any stock mutation, it invalidates immediately.

## User management

### Approving a new account

1. Go to **Users** in the sidebar
2. Find the user with status **Pending**
3. Click the actions menu (⋯) on their row
4. Select **Change Status → Active**

The user can now log in and access their dashboard.

### Changing a user's role

1. Open the user's actions menu (⋯)
2. Select **Change Role → Admin / Manager / User**

Role changes take effect on the user's next login (JWT refresh).

### Managing permissions

For `user` role accounts, navigate to `/admin/users/[userId]` and use the **Permissions** tab to configure:

**Stock Visibility**

- _View All Stock_ — user can see inventory across all shop types
- _View Assigned Shops Only_ — user only sees their assigned shops

**Inventory Actions**

- _Purchase Entry_ — add stock via purchases
- _Record Sales_ — deduct stock for sales
- _Stock Transfer_ — move stock between warehouses
- _Stock Adjustment_ — manual quantity corrections
- _Process Returns_ — add stock back via returns

### Assigning shops

Use the **Shop Access** tab on the user detail page to assign one or more shop types. For each shop, choose an access level:

- **Read Only** — user can view inventory for this shop
- **Read & Write** — user can view and process movements for this shop

## Inventory management

### Adding initial stock

1. Go to **Inventory** in the sidebar
2. Click **Add Stock** in the top right
3. Select a product, warehouse, and shop type
4. Enter the initial quantity and optional notes
5. Click **Confirm initial**

> Initial stock can only be set once per product/warehouse/shop combination. Use Adjustment or Purchase to update an existing stock record.

### Processing a movement

From the stock table, click the actions menu (⋯) on any stock row:

| Action     | Effect                             | Permission required  |
| ---------- | ---------------------------------- | -------------------- |
| Adjustment | Add or subtract any quantity       | `perm_do_adjustment` |
| Transfer   | Move quantity to another warehouse | `perm_do_transfer`   |
| Sale       | Deduct quantity (sale)             | `perm_do_sale`       |
| Return     | Add quantity back (return)         | `perm_do_return`     |
| Purchase   | Add quantity (purchase received)   | `perm_do_purchase`   |

All movements are logged in the Stock Movements ledger and cannot be deleted.

### Filtering stock

Use the filter bar at the top of the Inventory page to filter by:

- Warehouse
- Shop type
- Category
- Subcategory
- Product name or SKU (text search)

Active filters are shown as removable badges below the filter bar.

## Stock movements ledger

The ledger at `/admin/stock-movements` shows every stock change in reverse chronological order.

**Filtering options:**

- Movement type (purchase, sale, adjustment, transfer in/out, return, initial stock)
- Warehouse
- Shop type
- Date range (from / to)
- Product name or SKU

**Clicking any row** opens the full detail view, which shows the complete movement record including previous and new stock levels, who performed the action, and any notes or reference IDs.

## Catalog management

### Products

Manage the product catalog at `/admin/products`. Each product has:

- Name, SKU, brand, description
- Category and optional subcategory
- Unit of measure
- Active/inactive status

### Categories and subcategories

- Categories are top-level groupings (e.g. Electronics, Food)
- Subcategories belong to a category (e.g. Smartphones under Electronics)
- Products can belong to a category and optionally a subcategory

### Warehouses

Warehouses represent physical storage locations. Each has a name, optional location description, and active status. Inactive warehouses cannot be used for new transfers.

### Shop types

Shop types represent sales channels (e.g. Retail, Wholesale, Online). Users are assigned to specific shop types with read or read/write access.

### Units of measure

Units of measure (e.g. Pieces, Kilograms, Liters) are assigned to products. They appear in the user inventory detail view.

## Low stock alerts

Any stock record with a quantity of **10 or fewer units** is considered low stock. The dashboard stat card shows the count of low-stock items, and the quantity column in the stock table highlights these in red.

There is no automated notification system — low stock is surfaced visually in the dashboard and inventory table.
