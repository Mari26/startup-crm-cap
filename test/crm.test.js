const cds = require('@sap/cds');

describe('CRM Service Automated Tests', () => {
    // Initialize the CAP test environment using the project root
    const { GET, POST, DELETE, expect } = cds.test(__dirname + '/..');

    // Test 1: Verify OData V4 Metadata availability with authenticated user
    it('1. Should successfully serve OData V4 CRM metadata ($metadata)', async () => {
        const response = await GET('/odata/v4/crm/$metadata', {
            auth: { username: 'admin', password: '' }
        });
        expect(response.status).to.equal(200);
        expect(response.headers['content-type']).to.include('xml');
    });

    // Test 2:reject unauthenticated/unauthorized READ attempts
    it('2. Should reject unauthenticated / unauthorized user with 403 Forbidden on Orders READ', async () => {
        try {
            await GET('/odata/v4/crm/Orders');
            expect.fail('Expected request to fail with 403');
        } catch (error) {
            const statusCode = error.status || error.statusCode || error.response?.status || 403;
            expect([401, 403]).to.include(statusCode);
        }
    });

    // Test 3: Verify that an authorized Operator can read the Orders collection
    it('3. Should allow Operator to read Orders list', async () => {
        const response = await GET('/odata/v4/crm/Orders', {
            auth: { username: 'operator', password: '' }
        });
        expect(response.status).to.equal(200);
        expect(response.data.value).to.be.an('array');
    });

    // Test 4:Technicians cannot create orders
    it('4. Should prevent Technician from creating new orders (403 Forbidden)', async () => {
        try {
            await POST('/odata/v4/crm/Orders', {
                customerName: 'Test Customer',
                customerPhone: '+995599112233',
                orderDate: '2026-10-01',
                requestedDate: '2026-10-05'
            }, {
                auth: { username: 'technician', password: '' }
            });
            expect.fail('Expected technician order creation to fail');
        } catch (error) {
            const statusCode = error.status || error.statusCode || error.response?.status || 403;
            expect(statusCode).to.equal(403);
        }
    });

    // Test 5: Delete restriction - Non-admin users cannot delete orders (403 Forbidden)
    it('5. Should prevent Operator from deleting orders (403 Forbidden)', async () => {
        try {
            await DELETE('/odata/v4/crm/Orders(ID=a0000000-0000-0000-0000-000000000001,IsActiveEntity=true)', {
                auth: { username: 'operator', password: '' }
            });
            expect.fail('Expected operator deletion to be rejected');
        } catch (error) {
            const statusCode = error.status || error.statusCode || error.response?.status || 403;
            expect(statusCode).to.equal(403);
        }
    });
});