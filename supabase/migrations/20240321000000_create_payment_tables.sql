-- Payment accounts table
CREATE TABLE payment_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    paypal_email VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_application_id UUID REFERENCES job_applications(id),
    employer_id UUID REFERENCES profiles(id),
    jobseeker_id UUID REFERENCES profiles(id),
    amount DECIMAL(10,2),
    platform_fee DECIMAL(10,2),
    status VARCHAR(50),
    paypal_transaction_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment account"
    ON payment_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment account"
    ON payment_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() IN (employer_id, jobseeker_id));