sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"project1/test/integration/pages/OrdersList.gen",
	"project1/test/integration/pages/OrdersObjectPage.gen",
	"project1/test/integration/pages/OrderItemsObjectPage.gen"
], function (JourneyRunner, OrdersListGenerated, OrdersObjectPageGenerated, OrderItemsObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('project1') + '/test/flp.html#app-preview',
        pages: {
			onTheOrdersListGenerated: OrdersListGenerated,
			onTheOrdersObjectPageGenerated: OrdersObjectPageGenerated,
			onTheOrderItemsObjectPageGenerated: OrderItemsObjectPageGenerated
        },
        async: true
    });

    return runner;
});

