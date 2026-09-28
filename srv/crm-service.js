const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
    const { Orders, Products, Customers, OrderItems } = this.entities;

    function getCriticality(status) {
        if (!status) return 5;
        const normalized = status.trim().toLowerCase();
        if (normalized === 'completed') return 3; // Green
        if (normalized === 'closed') return 0;    // Grey
        return 5;                                 // Blue (Approved)
    }

    // Helper: Identify current user role reliably
    function getUserRole(req) {
        const user = req.user;
        const userId = (user && user.id) ? user.id.toLowerCase() : '';

        // 1. Direct role check
        if (user.is('Admin') || userId === 'admin') return 'Admin';
        if (user.is('Technician') || userId === 'technician') return 'Technician';
        if (user.is('Operator') || userId === 'operator') return 'Operator';

        // 2. Roles collection check
        if (user._roles) {
            if (user._roles.Admin) return 'Admin';
            if (user._roles.Technician) return 'Technician';
            if (user._roles.Operator) return 'Operator';
        }

        return 'Operator';
    }

    // 1. Initialize draft
    this.before('NEW', Orders.drafts, async (req) => {
        const role = getUserRole(req);
        if (role === 'Technician') {
            return req.reject(403, 'Access Denied: Technicians are not authorized to create new orders!');
        }

        req.data.orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        req.data.orderDate = new Date().toISOString().slice(0, 10);
        req.data.status = 'Approved';
        req.data.statusCriticality = 5;
        req.data.isPaid = false;
        req.data.smsSent = false;
    });

    // 2. Value help auto sync on draft PATCH
    this.before('PATCH', Orders.drafts, async (req) => {
        const data = req.data;
        if (data.customer_ID) {
            const cust = await SELECT.one.from(Customers).where({ ID: data.customer_ID });
            if (cust) {
                data.customerName = `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
                data.customerPhone = cust.phone;
            }
        }
        if (data.status) {
            data.statusCriticality = getCriticality(data.status);
        }
    });

    // 3. Delete restriction: Admin only
    this.before('DELETE', Orders, async (req) => {
        const role = getUserRole(req);
        if (role !== 'Admin') {
            return req.reject(403, 'Access Denied: Only Administrators are authorized to delete orders!');
        }
    });

    // 4. OrderItems restriction: Technicians cannot modify items
    this.before(['CREATE', 'UPDATE', 'DELETE'], [OrderItems, OrderItems.drafts], async (req) => {
        const role = getUserRole(req);
        if (role === 'Technician') {
            return req.reject(403, 'Technicians are not allowed to add, modify, or delete order items.');
        }
    });

    // 5. Strict Validation and Save Logic
    this.before(['CREATE', 'UPDATE'], Orders, async (req) => {
        const order = req.data;
        const role = getUserRole(req);

        let existing = null;
        if (order.ID) {
            existing = await SELECT.one.from(Orders).where({ ID: order.ID });
        }

        // ==========================================
        // --- 1. ADMIN ROLE RULES ---
        // ==========================================
        if (role === 'Admin') {
            if (existing && order.orderNumber && order.orderNumber !== existing.orderNumber) {
                return req.reject('orderNumber', 'Order Number is auto-generated and cannot be modified even by Administrators!');
            }
        }

        // ==========================================
        // --- 2. TECHNICIAN ROLE RULES & POPUPS ---
        // ==========================================
        if (role === 'Technician') {
            if (req.event === 'CREATE') {
                return req.reject(403, 'Access Denied: Technicians are not authorized to create orders!');
            }

            // Closed order protection: already closed orders cannot be touched
            if (existing && existing.status === 'Closed') {
                return req.reject(403, 'This order is Closed. Only Administrators can make changes.');
            }

            if (!order.technicianNotes && (!existing || !existing.technicianNotes)) {
                return req.reject('technicianNotes', 'Technician Notes is mandatory for technicians.');
            }

            if (existing) {
                if (order.customerName && order.customerName !== existing.customerName) {
                    return req.reject('customerName', 'Access Denied: Technicians cannot modify Customer Name!');
                }
                if (order.customerPhone && order.customerPhone !== existing.customerPhone) {
                    return req.reject('customerPhone', 'Access Denied: Technicians cannot modify Phone Number!');
                }
                if (order.orderDate && order.orderDate !== existing.orderDate) {
                    return req.reject('orderDate', 'Access Denied: Technicians cannot modify Order Intake Date!');
                }
                if (order.requestedDate && order.requestedDate !== existing.requestedDate) {
                    return req.reject('requestedDate', 'Access Denied: Technicians cannot modify Requested Due Date!');
                }
                if (order.operatorNotes && order.operatorNotes !== existing.operatorNotes) {
                    return req.reject('operatorNotes', 'Access Denied: Technicians cannot modify Operator Notes!');
                }
                if (order.isPaid !== undefined && order.isPaid !== existing.isPaid) {
                    return req.reject('isPaid', 'Access Denied: Technicians cannot change Payment Confirmation!');
                }
                if (order.smsSent !== undefined && order.smsSent !== existing.smsSent) {
                    return req.reject('smsSent', 'Access Denied: Technicians cannot change Notification SMS Sent!');
                }
            }

            if (order.status === 'Closed') {
                return req.reject('status', 'Access Denied: Technicians cannot close orders. Set status to Completed.');
            }

            if (!order.status || order.status === 'Approved') {
                order.status = 'Completed';
            }
        }

        // ==========================================
        // --- 3. OPERATOR ROLE RULES & POPUPS ---
        // ==========================================
        if (role === 'Operator') {
            // Check if existing database record is ALREADY Closed
            if (existing && existing.status === 'Closed') {
                return req.reject(403, 'This order is Closed. Only Administrators can make changes.');
            }

            // Block filling technicianNotes
            if (order.technicianNotes) {
                if (!existing || order.technicianNotes !== existing.technicianNotes) {
                    return req.reject('technicianNotes', 'Access Denied: Operators have no permission to fill or edit Technician Notes!');
                }
            }

            if (!order.customerName) req.reject('customerName', 'Customer Name is required.');
            if (!order.customerPhone) req.reject('customerPhone', 'Phone Number is required.');
            if (!order.orderDate) req.reject('orderDate', 'Order Intake Date is required.');
            if (!order.requestedDate) req.reject('requestedDate', 'Requested Due Date is mandatory.');

            if (order.orderDate && order.requestedDate) {
                const intake = new Date(order.orderDate);
                const requested = new Date(order.requestedDate);
                if (requested < intake) {
                    return req.reject('requestedDate', 'Requested Due Date cannot be earlier than Order Intake Date!');
                }
            }

            const wasCompleted = existing && existing.status === 'Completed';

            // Operator cannot select 'Completed' manually
            if (order.status === 'Completed' && !wasCompleted) {
                return req.reject('status', 'Access Denied: Operators cannot manually mark status as Completed. Only technicians can complete work.');
            }

            // Operator trying to close before technical team finished
            if (order.status === 'Closed' && !wasCompleted) {
                return req.reject('status', 'Access Denied: Order cannot be closed until technical work is completed!');
            }

            // Payment and SMS validation: allowed only if status was Completed
            if (!wasCompleted) {
                if (order.isPaid === true) {
                    return req.reject('isPaid', 'Technical team has not finished yet! Payment cannot be marked until status is Completed.');
                }
                if (order.smsSent === true) {
                    return req.reject('smsSent', 'Technical team has not finished yet! SMS cannot be marked until status is Completed.');
                }
            }

            // Automatic closing when Completed order gets both checkboxes
            if (wasCompleted && order.isPaid === true && order.smsSent === true) {
                order.status = 'Closed';
            }
        }

        // Phone format validation
        if (order.customerPhone) {
            const phoneRegex = /^\+?[0-9]{9,15}$/;
            if (!phoneRegex.test(order.customerPhone)) {
                return req.reject('customerPhone', 'Invalid phone number format. Please provide 9 to 15 digits.');
            }
        }

        // Auto insert manual customer into Customers table
        if (!order.customer_ID && order.customerName && order.customerPhone) {
            const names = order.customerName.trim().split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';

            const existingCustomer = await SELECT.one.from(Customers).where({ phone: order.customerPhone });
            if (existingCustomer) {
                order.customer_ID = existingCustomer.ID;
            } else {
                const newCustomerId = cds.utils.uuid();
                await INSERT.into(Customers).entries({
                    ID: newCustomerId,
                    firstName: firstName,
                    lastName: lastName,
                    phone: order.customerPhone,
                    email: ''
                });
                order.customer_ID = newCustomerId;
            }
        }

        // Set status criticality
        if (order.status) {
            order.statusCriticality = getCriticality(order.status);
        }

        // Total price calculation
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            let sumGEL = 0;
            for (const item of order.items) {
                if (!item.unitPriceGEL && item.product_ID) {
                    const prod = await SELECT.one.from(Products).where({ ID: item.product_ID });
                    if (prod) item.unitPriceGEL = prod.basePriceGEL;
                }
                const qty = item.quantity || 1;
                const price = item.unitPriceGEL || 0;
                item.lineTotalGEL = qty * price;
                sumGEL += item.lineTotalGEL;
            }
            order.totalPriceGEL = sumGEL;
        }

    // Live currency conversion (GEL -> USD, EUR) 
        if (order.totalPriceGEL) {
            const FALLBACK_RATES = { USD: 0.37, EUR: 0.34 };

            try {
                const response = await fetch('https://open.er-api.com/v6/latest/GEL');
                if (!response.ok) throw new Error(`API status: ${response.status}`);
                
                const rateData = await response.json();
                const usdRate = rateData?.rates?.USD || FALLBACK_RATES.USD;
                const eurRate = rateData?.rates?.EUR || FALLBACK_RATES.EUR;

                order.totalPriceUSD = parseFloat((order.totalPriceGEL * usdRate).toFixed(2));
                order.totalPriceEUR = parseFloat((order.totalPriceGEL * eurRate).toFixed(2));
            } catch (err) {
                // Fallback to static rates if live API fails or network is offline
                order.totalPriceUSD = parseFloat((order.totalPriceGEL * FALLBACK_RATES.USD).toFixed(2));
                order.totalPriceEUR = parseFloat((order.totalPriceGEL * FALLBACK_RATES.EUR).toFixed(2));
            }
        }

    });
});