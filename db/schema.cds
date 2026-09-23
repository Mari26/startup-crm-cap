namespace app.crm;

using { cuid, managed } from '@sap/cds/common';

// 1. Statuses Dictionary
entity Statuses {
    key code        : String(30);
        name        : String(50);
        criticality : Integer;
}

// 2. Products Catalog
entity Products : cuid, managed {
    name         : String(100);
    category     : String(50);
    basePriceGEL : Decimal(10,2);
    description  : String(500);
}

// 3. Customers
entity Customers : cuid, managed {
    firstName    : String(50);
    lastName     : String(50);
    phone        : String(30);
    email        : String(100);
    orders       : Association to many Orders on orders.customer = $self;
}

// 4. Orders Entity
entity Orders : cuid, managed {
    orderNumber         : String(50);
    customerName        : String(100);
    customerPhone       : String(30);
    
    orderDate           : Date;
    requestedDate       : Date;
    
    status              : String(30) default 'Approved';
    statusCriticality   : Integer default 5;
    
    totalPriceGEL       : Decimal(10,2) default 0.00;
    totalPriceUSD       : Decimal(10,2) default 0.00;
    totalPriceEUR       : Decimal(10,2) default 0.00;
    
    isPaid              : Boolean default false;
    smsSent             : Boolean default false;
    
    operatorNotes       : String(500);
    technicianNotes     : String(500);
    
    customer            : Association to Customers;
    items               : Composition of many OrderItems on items.order = $self;
}

// 5. Order Items
entity OrderItems : cuid {
    order        : Association to Orders;
    product      : Association to Products;
    quantity     : Integer default 1;
    unitPriceGEL : Decimal(10,2);
    lineTotalGEL : Decimal(10,2);
}