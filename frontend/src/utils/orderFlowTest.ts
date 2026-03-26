/**
 * Comprehensive Order Flow Test Utility
 * Tests the entire process: Cart → Order → Dashboard → Completion → Deletion
 * 
 * HOW TO USE:
 * 1. Open browser console (F12)
 * 2. Import: import { orderFlowTester } from '@/utils/orderFlowTest';
 * 3. Run: orderFlowTester.runFullTest().then(() => orderFlowTester.printResults());
 * 4. Check results for any failures
 */

import { cartAPI, ordersAPI, adminAPI } from '@/services/api';

export interface OrderFlowTestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

export class OrderFlowTester {
  private results: OrderFlowTestResult[] = [];

  async runFullTest(): Promise<OrderFlowTestResult[]> {
    console.log('🧪 Starting Comprehensive Order Flow Test...');
    
    try {
      // Step 1: Test Cart Operations
      await this.testCartOperations();
      
      // Step 2: Test Order Creation
      await this.testOrderCreation();
      
      // Step 3: Test Dashboard Calculations
      await this.testDashboardCalculations();
      
      // Step 4: Test Order Status Updates
      await this.testOrderStatusUpdates();
      
      // Step 5: Test Order Deletion
      await this.testOrderDeletion();
      
    } catch (error) {
      console.error('❌ Order Flow Test Failed:', error);
    }
    
    return this.results;
  }

  private async testCartOperations(): Promise<void> {
    console.log('🛒 Testing Cart Operations...');
    
    try {
      // Test adding to cart
      const addResult = await cartAPI.addItem('test-product-id', 2);
      this.addResult('Add to Cart', true, null, addResult.data);
      
      // Test getting cart
      const getResult = await cartAPI.get();
      this.addResult('Get Cart', true, null, getResult.data);
      
      // Test updating quantity
      if (getResult.data?.items?.length > 0) {
        const itemId = getResult.data.items[0].id;
        await cartAPI.updateItem(itemId, { quantity: 3 });
        this.addResult('Update Cart Quantity', true);
      }
      
      // Test removing item
      if (getResult.data?.items?.length > 0) {
        const itemId = getResult.data.items[0].id;
        await cartAPI.removeItem(itemId);
        this.addResult('Remove Cart Item', true);
      }
      
    } catch (error: any) {
      this.addResult('Cart Operations', false, error.message);
    }
  }

  private async testOrderCreation(): Promise<void> {
    console.log('📦 Testing Order Creation...');
    
    try {
      // First add items to cart
      await cartAPI.addItem('test-product-id', 1);
      
      // Create order from cart
      const orderData = {
        items: [{ product_id: 'test-product-id', quantity: 1 }],
        shipping_address: '123 Test Street, Test City, Test Country',
        payment_method: 'credit_card'
      };
      
      const orderResult = await ordersAPI.create(orderData);
      this.addResult('Create Order', true, null, orderResult.data);
      
      // Verify cart is cleared after order
      const cartAfterOrder = await cartAPI.get();
      const cartEmpty = !cartAfterOrder.data?.items?.length;
      this.addResult('Cart Cleared After Order', cartEmpty, cartEmpty ? null : 'Cart not cleared');
      
    } catch (error: any) {
      this.addResult('Order Creation', false, error.message);
    }
  }

  private async testDashboardCalculations(): Promise<void> {
    console.log('📊 Testing Dashboard Calculations...');
    
    try {
      // Get buyer orders
      const ordersResult = await adminAPI.getBuyerOrders();
      const orders = ordersResult.data || [];
      
      // Test order counting
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((order: any) => 
        order.status === 'pending' || order.status === 'awaiting_approval'
      ).length;
      const completedOrders = orders.filter((order: any) => 
        order.status === 'completed' || order.status === 'delivered'
      ).length;
      
      // Test total spent calculation
      const totalSpent = orders.reduce((sum: number, order: any) => 
        sum + (Number(order.total_amount) || 0), 0
      );
      
      this.addResult('Dashboard Calculations', true, null, {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent
      });
      
      // Test filtering
      const pendingFiltered = orders.filter((order: any) => 
        order.status === 'pending' || order.status === 'awaiting_approval'
      );
      
      this.addResult('Order Filtering', true, null, {
        pendingCount: pendingFiltered.length,
        pendingOrders: pendingFiltered.map((o: any) => `${o.id}:${o.status}`)
      });
      
    } catch (error: any) {
      this.addResult('Dashboard Calculations', false, error.message);
    }
  }

  private async testOrderStatusUpdates(): Promise<void> {
    console.log('🔄 Testing Order Status Updates...');
    
    try {
      // Get orders to test status updates
      const ordersResult = await adminAPI.getBuyerOrders();
      const orders = ordersResult.data || [];
      
      if (orders.length > 0) {
        const testOrder = orders[0];
        
        // Test status update (this might require admin permissions)
        try {
          // Note: ordersAPI.updateStatus does not exist; status updates are handled via admin endpoints.
          this.addResult('Order Status Update', false, 'Not supported by ordersAPI (use admin order management endpoints)');
        } catch (error: any) {
          // Status update might require admin permissions
          this.addResult('Order Status Update', false, `Permission required: ${error.message}`);
        }
      } else {
        this.addResult('Order Status Update', false, 'No orders to test');
      }
      
    } catch (error: any) {
      this.addResult('Order Status Updates', false, error.message);
    }
  }

  private async testOrderDeletion(): Promise<void> {
    console.log('🗑️ Testing Order Deletion...');
    
    try {
      // Get completed orders
      const ordersResult = await adminAPI.getBuyerOrders();
      const orders = ordersResult.data || [];
      const completedOrders = orders.filter((order: any) => 
        order.status === 'completed' || order.status === 'delivered'
      );
      
      if (completedOrders.length > 0) {
        const testOrder = completedOrders[0];
        
        // Test order deletion
        await ordersAPI.delete(testOrder.id);
        this.addResult('Delete Completed Order', true);
        
        // Verify order is deleted
        const ordersAfterDelete = await adminAPI.getBuyerOrders();
        const orderStillExists = ordersAfterDelete.data?.some((o: any) => o.id === testOrder.id);
        this.addResult('Order Deleted Successfully', !orderStillExists, 
          orderStillExists ? 'Order still exists after deletion' : null);
        
      } else {
        this.addResult('Delete Completed Order', false, 'No completed orders to delete');
      }
      
    } catch (error: any) {
      this.addResult('Order Deletion', false, error.message);
    }
  }

  private addResult(step: string, success: boolean, error?: string | null, data?: any): void {
    this.results.push({
      step,
      success,
      error: error || undefined,
      data
    });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${step}${error ? `: ${error}` : ''}`);
  }

  printResults(): void {
    console.log('\n📋 Order Flow Test Results:');
    console.log('================================');
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.step}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.data) {
        console.log(`   Data:`, result.data);
      }
    });
    
    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    
    console.log(`\n📊 Summary: ${successCount}/${totalCount} tests passed`);
    
    if (successCount === totalCount) {
      console.log('🎉 All tests passed! Order flow is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.');
    }
  }
}

// Export singleton instance
export const orderFlowTester = new OrderFlowTester();
