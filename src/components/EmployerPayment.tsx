import React, { useState } from 'react';
import { PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

interface PaymentProps {
    jobApplicationId: string;
    jobseekerId: string;
    amount: number;
    onSuccess: () => void;
}

export function EmployerPayment({ jobApplicationId, jobseekerId, amount, onSuccess }: PaymentProps) {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const platformFee = amount * 0.10; // 10% platform fee
    const totalAmount = amount + platformFee;

    const handlePaymentSuccess = async (paypalTransactionId: string) => {
        try {
            const { error } = await supabase
                .from('payment_transactions')
                .insert({
                    job_application_id: jobApplicationId,
                    employer_id: user?.id,
                    jobseeker_id: jobseekerId,
                    amount: amount,
                    platform_fee: platformFee,
                    status: 'completed',
                    paypal_transaction_id: paypalTransactionId
                });

            if (error) throw error;
            onSuccess();
        } catch (err) {
            console.error('Error recording payment:', err);
            setError('Failed to record payment');
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Payment Details</h3>
            <div className="mb-4">
                <p className="text-gray-600">Payment Amount: ${amount}</p>
                <p className="text-gray-600">Platform Fee (10%): ${platformFee}</p>
                <p className="text-lg font-bold">Total: ${totalAmount}</p>
            </div>
            
            {error && (
                <div className="mb-4 text-red-600">{error}</div>
            )}

            <PayPalButtons
                createOrder={(data, actions) => {
                    return actions.order.create({
                        purchase_units: [
                            {
                                amount: {
                                    value: totalAmount.toString()
                                }
                            }
                        ]
                    });
                }}
                onApprove={async (data, actions) => {
                    if (actions.order) {
                        const order = await actions.order.capture();
                        await handlePaymentSuccess(order.id);
                    }
                }}
                onError={(err) => {
                    console.error('PayPal Error:', err);
                    setError('Payment failed. Please try again.');
                }}
            />
        </div>
    );
}