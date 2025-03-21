// src/components/admin/WholesalerCodes.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../components/SupabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'react-toastify';
import Navbar from '../Navbar';

const WholesalerCodes = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeCount, setCodeCount] = useState(1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      // Just fetch the codes without trying to join with other tables
      const { data, error } = await supabase
        .from('wholesaler_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('Failed to load codes');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    // Simple code generation - alphanumeric, 8 characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateCodes = async () => {
    try {
      setGenerating(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to generate codes');
        return;
      }
      
      const newCodes = [];
      for (let i = 0; i < codeCount; i++) {
        newCodes.push({
          code: generateCode(),
          created_by: user.id,  // Store the user ID as is
          creator_email: user.email // Add an extra field for email if helpful
        });
      }
      
      const { error } = await supabase
        .from('wholesaler_codes')
        .insert(newCodes);
      
      if (error) throw error;
      
      toast.success(`Generated ${codeCount} new access code(s)`);
      fetchCodes();
    } catch (error) {
      console.error('Error generating codes:', error);
      toast.error('Failed to generate codes');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Wholesaler Access Codes</h1>
        
        <div className="flex gap-4 mb-6">
          <Input
            type="number"
            min="1"
            max="50"
            value={codeCount}
            onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
            className="w-24"
          />
          <Button 
            onClick={handleGenerateCodes}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Codes'}
          </Button>
        </div>
        
        {loading ? (
          <p>Loading codes...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Used At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono">{code.code}</TableCell>
                  <TableCell>
                    {code.is_used ? (
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs">Used</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 rounded text-xs">Available</span>
                    )}
                  </TableCell>
                  <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{code.used_at ? new Date(code.used_at).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No codes found. Generate some using the button above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
};

export default WholesalerCodes;