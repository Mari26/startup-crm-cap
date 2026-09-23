using { app.crm as crm } from '../db/schema';

// Main CRM Service
service CRMService @(path: '/odata/v4/crm') @(requires: 'authenticated-user') {

    @readonly
    entity Statuses as projection on crm.Statuses;

    entity Products as projection on crm.Products;
    entity Customers as projection on crm.Customers;

    @odata.draft.enabled
    @Capabilities: {
        InsertRestrictions.Permissions: [
            { grant: 'CREATE', to: ['Admin', 'Operator'] }
        ],
        DeleteRestrictions.Permissions: [
            { grant: 'DELETE', to: 'Admin' }
        ]
    }
    entity Orders as projection on crm.Orders;

    @Capabilities: {
        InsertRestrictions.Permissions: [
            { grant: 'CREATE', to: ['Admin', 'Operator'] }
        ],
        DeleteRestrictions.Permissions: [
            { grant: 'DELETE', to: ['Admin', 'Operator'] }
        ],
        UpdateRestrictions.Permissions: [
            { grant: 'UPDATE', to: ['Admin', 'Operator'] }
        ]
    }
    entity OrderItems as projection on crm.OrderItems;
}

// ---------------- VALUE HELPS & AUTO-FILL ----------------

annotate CRMService.Orders {
    customer @(
        Common.ValueList: {
            Label: 'Existing Customers',
            CollectionPath: 'Customers',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: customer_ID, ValueListProperty: 'ID' },
                { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: customerName, ValueListProperty: 'firstName' },
                { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: customerPhone, ValueListProperty: 'phone' },
                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'lastName' }
            ]
        },
        Common.Text: customer.firstName,
        Common.TextArrangement: #TextOnly
    );

    customerPhone @(
        Communication.IsPhoneNumber,
        assert.format: '^\+?[0-9]{9,15}$'
    );

    status @(
        Common.ValueList: {
            Label: 'Order Status',
            CollectionPath: 'Statuses',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: status, ValueListProperty: 'code' },
                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
            ]
        }
    );
}

annotate CRMService.OrderItems {
    product @(
        Common.ValueList: {
            Label: '3D Products Catalog',
            CollectionPath: 'Products',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: product_ID, ValueListProperty: 'ID' },
                { $Type: 'Common.ValueListParameterOut',   LocalDataProperty: unitPriceGEL, ValueListProperty: 'basePriceGEL' },
                { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' }
            ]
        },
        Common.Text: product.name,
        Common.TextArrangement: #TextOnly
    );
}

// ---------------- UI ANNOTATIONS ----------------

annotate CRMService.Orders with @(
    UI.SelectionFields: [
        orderNumber,
        status,
        orderDate,
        requestedDate,
        isPaid
    ],

    UI.HeaderInfo: {
        TypeName: '3D Print Order',
        TypeNamePlural: '3D Print Orders',
        Title: { Value: orderNumber },
        Description: { Value: customerName }
    },

    // Main List Report Table Columns
    UI.LineItem: [
        { 
            $Type: 'UI.DataField', 
            Value: orderNumber,        
            Label: 'Order No.',
            @UI.Importance: #High
        },
        { 
            $Type: 'UI.DataField', 
            Value: status, 
            Label: 'Status',
            Criticality: statusCriticality,
            CriticalityRepresentation: #WithoutIcon,
            @UI.Importance: #High
        },
        { 
            $Type: 'UI.DataField', 
            Value: customerName,       
            Label: 'Customer Name',
            @UI.Importance: #High
        },
        { 
            $Type: 'UI.DataField', 
            Value: totalPriceGEL,      
            Label: 'Total (GEL)',
            @UI.Importance: #High
        },
        { 
            $Type: 'UI.DataField', 
            Value: customerPhone,      
            Label: 'Phone',
            @UI.Importance: #Medium
        },
        { 
            $Type: 'UI.DataField', 
            Value: orderDate,          
            Label: 'Intake Date',
            @UI.Importance: #Low
        },
        { 
            $Type: 'UI.DataField', 
            Value: requestedDate,      
            Label: 'Requested Date',
            @UI.Importance: #Low
        },
        { 
            $Type: 'UI.DataField', 
            Value: isPaid,             
            Label: 'Paid',
            @UI.Importance: #Medium
        },
        { 
            $Type: 'UI.DataField', 
            Value: smsSent,            
            Label: 'SMS Sent',
            @UI.Importance: #Low
        }
    ],

    UI.Facets: [
        {
            $Type: 'UI.CollectionFacet',
            ID: 'OrderMainDetails',
            Label: 'Order Management Workflow',
            Facets: [
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: '1. Customer & Order Intake',
                    Target: '@UI.FieldGroup#CustomerSection'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: '2. Technical & Production Stage',
                    Target: '@UI.FieldGroup#ProductionSection'
                },
                {
                    $Type: 'UI.ReferenceFacet',
                    Label: '3. Financial Summary',
                    Target: '@UI.FieldGroup#FinancialSection'
                }
            ]
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'ItemsSection',
            Label: 'Order Items (3D Models to Print)',
            Target: 'items/@UI.LineItem'
        }
    ],

    UI.FieldGroup #CustomerSection: {
        Data: [
            { 
                $Type: 'UI.DataField', 
                Value: orderNumber, 
                Label: 'Order No.',
                ![@Common.FieldControl]: #ReadOnly 
            },
            { $Type: 'UI.DataField', Value: customer_ID,      Label: 'Select Existing Customer' },
            { $Type: 'UI.DataField', Value: customerName,     Label: 'Customer Full Name (Manual / Auto)' },
            { $Type: 'UI.DataField', Value: customerPhone,    Label: 'Phone Number' },
            { $Type: 'UI.DataField', Value: orderDate,        Label: 'Order Intake Date' },
            { $Type: 'UI.DataField', Value: requestedDate,    Label: 'Requested Due Date' },
            { $Type: 'UI.DataField', Value: operatorNotes,    Label: 'Customer / Operator Notes' }
        ]
    },

    UI.FieldGroup #ProductionSection: {
        Data: [
            { 
                $Type: 'UI.DataField', 
                Value: status, 
                Label: 'Production Status', 
                Criticality: statusCriticality 
            },
            { 
                $Type: 'UI.DataField', 
                Value: technicianNotes, 
                Label: 'Technician Notes' 
            },
            { 
                $Type: 'UI.DataField', 
                Value: isPaid, 
                Label: 'Payment Confirmed' 
            },
            { 
                $Type: 'UI.DataField', 
                Value: smsSent, 
                Label: 'Notification SMS Sent' 
            }
        ]
    },

    UI.FieldGroup #FinancialSection: {
        Data: [
            { 
                $Type: 'UI.DataField', 
                Value: totalPriceGEL, 
                Label: 'Total Amount (GEL)',
                ![@Common.FieldControl]: #ReadOnly 
            },
            { 
                $Type: 'UI.DataField', 
                Value: totalPriceUSD, 
                Label: 'Calculated USD',
                ![@Common.FieldControl]: #ReadOnly 
            },
            { 
                $Type: 'UI.DataField', 
                Value: totalPriceEUR, 
                Label: 'Calculated EUR',
                ![@Common.FieldControl]: #ReadOnly 
            }
        ]
    }
);

annotate CRMService.OrderItems with @(
    UI.HeaderInfo: {
        TypeName: 'Item',
        TypeNamePlural: 'Items',
        Title: { Value: product.name }
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: product_ID,   Label: 'Product' },
        { $Type: 'UI.DataField', Value: quantity,     Label: 'Quantity' },
        { $Type: 'UI.DataField', Value: unitPriceGEL, Label: 'Unit Price (GEL)' },
        { $Type: 'UI.DataField', Value: lineTotalGEL, Label: 'Subtotal (GEL)' }
    ],
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Item Details',
            Target: '@UI.FieldGroup#ItemDetails'
        }
    ],
    UI.FieldGroup #ItemDetails: {
        Data: [
            { $Type: 'UI.DataField', Value: product_ID,   Label: 'Product' },
            { $Type: 'UI.DataField', Value: quantity,     Label: 'Quantity' },
            { $Type: 'UI.DataField', Value: unitPriceGEL, Label: 'Unit Price (GEL)' }
        ]
    }
);