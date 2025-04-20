import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { toast } from './ui/use-toast';
import { Loader2 } from 'lucide-react';

export function JobSeekerPayPalSetup() {
    const { user } = useAuth();
    const [paypalEmail, setPaypalEmail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchPayPalAccount();
        }
    }, [user]);

    const fetchPayPalAccount = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_accounts')
                .select('paypal_email')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setPaypalEmail(data.paypal_email || '');
            }
        } catch (error: any) {
            console.error('Error fetching PayPal account:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to fetch PayPal email",
                variant: "destructive",
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?.id) {
            toast({
                title: "Error",
                description: "You must be logged in to update PayPal email",
                variant: "destructive",
            });
            return;
        }

        if (!paypalEmail) {
            toast({
                title: "Error",
                description: "Please enter a valid PayPal email",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            // First check if record exists
            const { data: existingRecord } = await supabase
                .from('payment_accounts')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            let error;
            
            if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('payment_accounts')
                    .update({
                        paypal_email: paypalEmail,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);
                error = updateError;
            } else {
                // Insert new record
                const { error: insertError } = await supabase
                    .from('payment_accounts')
                    .insert({
                        user_id: user.id,
                        paypal_email: paypalEmail,
                    });
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: "Success",
                description: "PayPal email updated successfully",
            });
        } catch (error: any) {
            console.error('Error updating PayPal email:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update PayPal email",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        PayPal Email
                    </label>
                    <input
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="your.paypal@example.com"
                        disabled={loading}
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save PayPal Email'
                    )}
                </button>
            </form>
        </div>
    );
}

