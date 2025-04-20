import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const initialOptions = {
    clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID,
    currency: "USD",
    intent: "capture",
};

export function PayPalConfig({ children }: { children: React.ReactNode }) {
    return (
        <PayPalScriptProvider options={initialOptions}>
            {children}
        </PayPalScriptProvider>
    );
}