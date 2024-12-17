// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sample query functions
export const getProducts = async ({ category, condition, minPrice, maxPrice }) => {
  let query = supabase
    .from('products')
    .select(`
      *,
      seller:profiles(*),
      reviews(*)
    `)
    .eq('status', 'active');

  if (category) {
    query = query.eq('category', category);
  }
  if (condition) {
    query = query.eq('condition', condition);
  }
  if (minPrice) {
    query = query.gte('price', minPrice);
  }
  if (maxPrice) {
    query = query.lte('price', maxPrice);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const addToCart = async (userId, productId, quantity = 1) => {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: userId,
      product_id: productId,
      quantity
    });

  if (error) throw error;
  return data;
};