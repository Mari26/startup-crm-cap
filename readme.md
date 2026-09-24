# Startup CRM System

## 📌 Project Overview
This application is designed for a small startup, such as my **3D Factory Georgia** ([3dfactory.ge](https://3dfactory.ge/)), whose core business is on-demand 3D printing. The CRM system centralizes and manages orders across their entire lifecycle—from the initial request to manufacturing and final delivery.

---

## Target Users
The system has three distinct user roles:
* **Operator** (Sales & Order Intake)
* **Technician** (Production & Technical Team)
* **Admin / Manager** (Full System Access)

---

## 🎯 Problems & Solutions

### The Problem
Currently, the startup receives orders from multiple channels: social media, email, phone calls, and the website. The operator manually enters order details into disconnected documents, copies them to send to the technical team, and waits for updates. 

At the end of each month, tracking completed orders and total payments requires manually searching through files and recalculating numbers, which leads to human error and lost time.

### The Solution
A unified, web-based CRM that tracks every stage of an order automatically. It centralizes client communication, production notes, inventory/product selection, currency conversions, and order statuses in one shared dashboard.

---

## Database Entities (Data Model)
The system uses a 5-entity relational model with real-time currency conversion:

1. **Statuses** — Lookup table for order states (Code, Name, Badge Color).
2. **Products** — Product catalog with base pricing.
3. **Customers** — Client directory (Name, Phone number).
4. **Orders** — Main order header (Order ID, Dates, Total amounts, Currencies, Status ID).
5. **OrderItems** — Line items within an order (Product ID, Quantity, Line Total).

---

## Roles & Permissions

### 1. Operator
* **Create & Fill Orders:**
  * **Customer Info (Required):** Select an existing client from a dropdown or enter a new one manually (new clients auto-save to the database).
  * **Product Name (Required):** Select a product from a predefined dropdown list.
  * **Product Price (Required):** Auto-filled based on the selected product. Shows the unit price and calculates the total based on quantity. Converts the final amount to USD and EUR via a live API.
  * **Quantity (Required):** Number of items ordered.
  * **Dates (Required):** Order intake date and expected completion date (selected via date picker).
  * **Customer Notes (Optional):** Text field for special customer instructions.
* **Saving & Status Workflow:**
  * Clicking **Save** creates the order and sets its initial status to `Approved`.
* **Completion Steps:**
  * **Payment Received (Checkbox):** Disabled while the order is in progress. Becomes active only after the technician finishes production (`Completed`).
  * **Send SMS to Customer (Checkbox):** Disabled until the status is `Completed`.
  * After marking payment and SMS as sent, the operator clicks **Save**, which changes the status to `Closed`. Once closed, operators cannot edit or delete the order.

### 2. Technician
* **Technical Notes (Required):** Can add manufacturing or filament details into a designated notes field.
* **Permissions:** Read-only access to all customer and order fields filled by the operator.
* **Status Action:** Once production is complete and notes are saved, the order status changes from `Approved` to `Completed`.
* **Restrictions:** Cannot edit operator inputs or delete orders (the Delete button is completely hidden).

### 3. Admin (Manager)
* Full overview of all orders organized in a structured queue/table.
* Can view, edit, or delete any record at any stage (including `Closed` orders).
* Cannot modify the automatically generated Order ID.

---

## Order Lifecycle & Statuses

Orders transition through three stages:

| Status | Badge Color | Trigger / Action |

| **Approved** | 🔵 Blue | Set automatically when an Operator creates and saves a new order. |
| **Completed** | 🟢 Green | Set by the Technician after manufacturing is finished and notes are saved. |
| **Closed** | ⚪ Gray | Set by the Operator after verifying payment and notifying the client via SMS. |

---

## Core System Requirements
* **Auto-Generated Order IDs:** Every order receives a unique, system-generated, read-only ID.
* **Visual Status Identifiers:** Role dashboards must display orders clearly labeled with their respective color-coded status badges (`Approved` = Blue, `Completed` = Green, `Closed` = Gray).
* **Live Exchange Rate Integration:** Real-time API currency conversion for total pricing (GEL to USD / EUR).