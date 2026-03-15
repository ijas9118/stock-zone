# User Guide

Welcome to StockZone. This guide explains how to use the inventory system as a regular user — no technical knowledge required.

## Signing up

1. Go to the StockZone URL provided by your administrator
2. Click **Sign up** on the login page
3. Enter your full name, email address, and a password (minimum 6 characters)
4. Click **Sign Up**

Your account will be created with a **Pending** status. You will see a waiting screen until your administrator approves your account. Once approved, you can log in normally.

Alternatively, use the **Continue with Google** button to sign up with your Google account.

## Logging in

1. Go to the StockZone URL
2. Enter your email and password
3. Click **Sign In**

If you log in before your account is approved, you will see the pending screen again. Contact your administrator if you have been waiting longer than expected.

## Your inventory view

After logging in, you arrive at your personal inventory page. This shows all stock records for the shop types your administrator has assigned to you.

### Searching

Type in the search bar at the top to search by product name, SKU, or brand. Search begins after you type at least 2 characters. Results update automatically as you type.

### Filtering

Use the filter controls to narrow down by:

- **Warehouse** — show only stock at a specific warehouse
- **Shop type** — show only stock for a specific shop

> Filters must be set before inventory loads. The inventory list will show a prompt to either search or select a warehouse first.

### Understanding the inventory table

| Column      | Description                           |
| ----------- | ------------------------------------- |
| Product     | Product name and SKU                  |
| Location    | Shop type and warehouse               |
| Stock       | Current quantity with unit of measure |
| Last update | When the stock was last changed       |

Rows highlighted with a **red quantity** have 10 or fewer units remaining.

**Click any row** to open the full detail view for that stock item.

## Stock detail view

The detail view shows complete information about a single stock record and lets you process movements if you have the right permissions.

### What you can see

- Product name, SKU, and category
- Current warehouse and shop location
- Current stock quantity with status (Healthy or Low Stock)
- Last updated timestamp

### Processing a movement

If your administrator has granted you the relevant permissions, you will see action buttons on the right side of the detail view:

| Button       | What it does                     | When to use                            |
| ------------ | -------------------------------- | -------------------------------------- |
| **Sale**     | Reduces stock                    | When goods are sold to a customer      |
| **Purchase** | Increases stock                  | When new stock arrives from a supplier |
| **Transfer** | Moves stock to another warehouse | When relocating inventory              |
| **Adjust**   | Manual quantity correction       | When correcting a counting error       |
| **Return**   | Adds stock back                  | When a sold item is returned           |

Buttons that are greyed out mean you do not have permission for that action. Contact your administrator to request access.

### Entering a movement

1. Click the appropriate action button
2. Enter the quantity (for Sale and Purchase, enter a positive number — the system handles the direction)
3. Add optional notes (e.g. invoice number, reason for adjustment)
4. Click **Confirm**

A success notification appears at the top right of the screen. The stock quantity updates immediately.

## Your profile

Access your profile by clicking your avatar in the top right navigation bar.

Your profile shows:

- Your name, email, and account status
- Your assigned role (User, Manager, or Admin)
- The shop types you have access to and whether you have read-only or read & write access
- A summary of your permissions (which actions you can perform)

To sign out, scroll to the bottom of your profile page and click **Sign Out**.

## Getting help

If you encounter any issues:

- **Cannot log in** — check that your account has been approved by an administrator
- **Cannot see any inventory** — you may not have any shops assigned; contact your administrator
- **Action buttons are greyed out** — you need permission for that action; contact your administrator
- **Stock quantity looks wrong** — check the stock movements ledger with your administrator to trace any discrepancies

## Quick reference

| Task                  | Where                           |
| --------------------- | ------------------------------- |
| View all my inventory | Home page (/)                   |
| Search for a product  | Search bar on home page         |
| Process a sale        | Click product row → Sale button |
| View your permissions | Profile page                    |
| Sign out              | Profile page → Sign Out         |
