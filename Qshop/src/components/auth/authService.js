// authService.js
import { supabase } from '../components/SupabaseClient';
import { toast } from 'react-toastify'; // or your custom toast implementation

// Helper function to handle logout with redirect
export const handleLogout = async (navigate) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    // Clear session storage
    sessionStorage.removeItem('token');
    
    // Show success message using your toast system
    toast.success('Logged out successfully');
    
    // Redirect to login page
    navigate('/login');
    
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    toast.error('Failed to log out');
    return { success: false, error };
  }
};