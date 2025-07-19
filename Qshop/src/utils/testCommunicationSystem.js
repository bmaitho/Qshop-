// src/utils/testCommunicationSystem.js
// Test utilities for the new communication system

import { supabase } from '../components/SupabaseClient';
import { 
  canMarkAsShipped, 
  getCommunicationStatus, 
  sortOrdersByPriority 
} from './communicationUtils';

/**
 * Test the complete communication workflow
 */
export const testCommunicationWorkflow = async (orderItemId) => {
  console.log('🧪 Testing Communication Workflow for Order Item:', orderItemId);
  
  try {
    // 1. Get initial order state
    const { data: initialOrder, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
      
    if (error) throw error;
    
    console.log('📋 Initial State:', {
      buyer_contacted: initialOrder.buyer_contacted,
      buyer_agreed: initialOrder.buyer_agreed,
      can_ship: canMarkAsShipped(initialOrder),
      status: getCommunicationStatus(initialOrder)
    });
    
    // 2. Test: Mark buyer as contacted
    console.log('\n📞 Step 1: Marking buyer as contacted...');
    await supabase
      .from('order_items')
      .update({ buyer_contacted: true })
      .eq('id', orderItemId);
      
    const { data: afterContact } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
      
    console.log('✅ After Contact:', {
      buyer_contacted: afterContact.buyer_contacted,
      buyer_agreed: afterContact.buyer_agreed,
      can_ship: canMarkAsShipped(afterContact),
      status: getCommunicationStatus(afterContact)
    });
    
    // 3. Test: Mark buyer as agreed
    console.log('\n✅ Step 2: Marking buyer as agreed...');
    await supabase
      .from('order_items')
      .update({ buyer_agreed: true })
      .eq('id', orderItemId);
      
    const { data: afterAgreement } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', orderItemId)
      .single();
      
    console.log('🚀 After Agreement:', {
      buyer_contacted: afterAgreement.buyer_contacted,
      buyer_agreed: afterAgreement.buyer_agreed,
      can_ship: canMarkAsShipped(afterAgreement),
      status: getCommunicationStatus(afterAgreement)
    });
    
    // 4. Reset for next test
    console.log('\n🔄 Resetting for next test...');
    await supabase
      .from('order_items')
      .update({ 
        buyer_contacted: false,
        buyer_agreed: false 
      })
      .eq('id', orderItemId);
      
    console.log('✅ Communication workflow test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Communication workflow test failed:', error);
    return false;
  }
};

/**
 * Test order sorting algorithm
 */
export const testOrderSorting = async () => {
  console.log('🧪 Testing Order Sorting Algorithm...');
  
  try {
    // Get sample orders
    const { data: orders, error } = await supabase
      .from('order_items')
      .select('*')
      .limit(10);
      
    if (error) throw error;
    
    console.log('\n📋 Original Order (by creation time):');
    orders.forEach((order, index) => {
      const status = getCommunicationStatus(order);
      console.log(`${index + 1}. ${order.id.slice(-8)} - ${status.label} (${order.created_at})`);
    });
    
    // Apply smart sorting
    const sortedOrders = sortOrdersByPriority(orders);
    
    console.log('\n🎯 Sorted Order (by priority):');
    sortedOrders.forEach((order, index) => {
      const status = getCommunicationStatus(order);
      console.log(`${index + 1}. ${order.id.slice(-8)} - ${status.label} - Priority: ${status.emoji}`);
    });
    
    console.log('✅ Order sorting test completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Order sorting test failed:', error);
    return false;
  }
};

/**
 * Test profile display fallbacks
 */
export const testProfileDisplays = () => {
  console.log('🧪 Testing Profile Display Fallbacks...');
  
  const testProfiles = [
    // Complete profile
    {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '0712345678',
      campus_location: 'University of Nairobi'
    },
    // Missing email and phone
    {
      full_name: 'Jane Smith',
      email: null,
      phone: null,
      campus_location: 'Kenyatta University'
    },
    // Missing everything except name
    {
      full_name: 'Bob Wilson',
      email: null,
      phone: null,
      campus_location: null
    },
    // Completely empty profile
    {
      full_name: null,
      email: null,
      phone: null,
      campus_location: null
    }
  ];
  
  console.log('\n📋 Testing Profile Fallbacks:');
  testProfiles.forEach((profile, index) => {
    const displayInfo = getDisplayInfo(profile);
    console.log(`${index + 1}. ${JSON.stringify(displayInfo, null, 2)}`);
  });
  
  console.log('✅ Profile display test completed!');
  return true;
};

/**
 * Run all tests
 */
export const runAllTests = async (sampleOrderItemId = null) => {
  console.log('🚀 Running All Communication System Tests...\n');
  
  const results = {
    profileDisplays: testProfileDisplays(),
    orderSorting: await testOrderSorting(),
    communicationWorkflow: sampleOrderItemId ? await testCommunicationWorkflow(sampleOrderItemId) : null
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('- Profile Displays:', results.profileDisplays ? '✅ PASS' : '❌ FAIL');
  console.log('- Order Sorting:', results.orderSorting ? '✅ PASS' : '❌ FAIL');
  console.log('- Communication Workflow:', 
    results.communicationWorkflow === null ? '⏭️ SKIPPED (no order ID)' :
    results.communicationWorkflow ? '✅ PASS' : '❌ FAIL'
  );
  
  const allPassed = Object.values(results).every(result => result === true || result === null);
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return results;
};

/**
 * Quick verification of database schema
 */
export const verifyDatabaseSchema = async () => {
  console.log('🧪 Verifying Database Schema...');
  
  try {
    // Test if new columns exist
    const { data, error } = await supabase
      .from('order_items')
      .select('id, buyer_contacted, buyer_agreed')
      .limit(1);
      
    if (error) throw error;
    
    console.log('✅ Database schema verification passed!');
    console.log('- buyer_contacted column: ✅ EXISTS');
    console.log('- buyer_agreed column: ✅ EXISTS');
    
    return true;
  } catch (error) {
    console.error('❌ Database schema verification failed:', error);
    return false;
  }
};

// Export test runner for console use
window.testCommunicationSystem = {
  runAllTests,
  testCommunicationWorkflow,
  testOrderSorting,
  testProfileDisplays,
  verifyDatabaseSchema
};