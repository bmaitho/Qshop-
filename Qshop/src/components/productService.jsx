
import { supabase } from './SupabaseClient';

export const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (
          id,
          email,
          campus_location
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const fetchProductById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (
          id,
          email,
          campus_location,
          phone
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const searchProducts = async (query) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (
          id,
          email,
          campus_location
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};

export const fetchProductsByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:seller_id (
          id,
          email,
          campus_location
        )
      `)
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }
};