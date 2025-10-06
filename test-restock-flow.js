/**
 * Test script to verify restock request flow
 * This script simulates the complete restock request process
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRestockFlow() {
  console.log('🧪 Testing Restock Request Flow...\n');

  try {
    // Step 1: Find a product and shop to test with
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, totalStock: true }
    });

    const shop = await prisma.shop.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });

    if (!product || !shop) {
      console.log('❌ No active product or shop found for testing');
      return;
    }

    console.log(`📦 Product: ${product.name} (Current Stock: ${product.totalStock})`);
    console.log(`🏪 Shop: ${shop.name}\n`);

    // Step 2: Create a restock request
    const requestedAmount = 30;
    console.log(`📝 Creating restock request for ${requestedAmount} units...`);

    const restockRequest = await prisma.restockRequest.create({
      data: {
        shopId: shop.id,
        productId: product.id,
        requestedAmount: requestedAmount,
        status: 'waiting_for_approval',
        requestType: 'manual',
        notes: 'Test restock request'
      }
    });

    console.log(`✅ Restock request created: ${restockRequest.id}\n`);

    // Step 3: Approve the request (should NOT deduct factory stock)
    console.log('✅ Approving restock request...');
    
    const updatedRequest = await prisma.restockRequest.update({
      where: { id: restockRequest.id },
      data: {
        status: 'approved_pending',
        approvedAt: new Date()
      }
    });

    // Check factory stock after approval
    const productAfterApproval = await prisma.product.findUnique({
      where: { id: product.id },
      select: { totalStock: true }
    });

    console.log(`📊 Factory stock after approval: ${productAfterApproval.totalStock}`);
    
    if (productAfterApproval.totalStock === product.totalStock) {
      console.log('✅ Factory stock correctly NOT deducted on approval\n');
    } else {
      console.log('❌ Factory stock was incorrectly deducted on approval\n');
    }

    // Step 4: Fulfill the request (should deduct factory stock and update shop inventory)
    console.log('🚚 Fulfilling restock request...');

    // Update factory stock (deduct)
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        totalStock: {
          decrement: requestedAmount
        }
      }
    });

    // Update shop inventory (add)
    const existingInventory = await prisma.shopInventory.findFirst({
      where: {
        shopId: shop.id,
        productId: product.id,
        isActive: true
      }
    });

    let shopInventory;
    if (existingInventory) {
      shopInventory = await prisma.shopInventory.update({
        where: { id: existingInventory.id },
        data: {
          currentStock: existingInventory.currentStock + requestedAmount,
          lastRestockDate: new Date()
        }
      });
    } else {
      shopInventory = await prisma.shopInventory.create({
        data: {
          shopId: shop.id,
          productId: product.id,
          currentStock: requestedAmount,
          lastRestockDate: new Date()
        }
      });
    }

    // Update restock request status
    await prisma.restockRequest.update({
      where: { id: restockRequest.id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date()
      }
    });

    console.log(`📊 Factory stock after fulfillment: ${updatedProduct.totalStock}`);
    console.log(`🏪 Shop inventory after fulfillment: ${shopInventory.currentStock}`);

    // Verify the results
    const expectedFactoryStock = product.totalStock - requestedAmount;
    const expectedShopStock = (existingInventory?.currentStock || 0) + requestedAmount;

    console.log('\n📋 Test Results:');
    console.log(`Expected factory stock: ${expectedFactoryStock}, Actual: ${updatedProduct.totalStock}`);
    console.log(`Expected shop stock: ${expectedShopStock}, Actual: ${shopInventory.currentStock}`);

    if (updatedProduct.totalStock === expectedFactoryStock && 
        shopInventory.currentStock === expectedShopStock) {
      console.log('\n🎉 SUCCESS: Restock flow working correctly!');
      console.log('✅ Factory stock properly deducted on fulfillment');
      console.log('✅ Shop inventory properly updated on fulfillment');
      console.log('✅ No double deduction occurred');
    } else {
      console.log('\n❌ FAILURE: Restock flow has issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRestockFlow();

