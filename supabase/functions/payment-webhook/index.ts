import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { createClient } from '@supabase/supabase-js'

const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json())

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Main webhook route
app.post('/', async (req, res) => {
    try {
        const payload = req.body
        console.log("Received SePay webhook:", payload)

        const content = payload.content || payload.description || ""
        const amount = payload.transferAmount || payload.amount || 0

        // Extract "WINDI USERxxxxx"
        const match = content.match(/WINDI\s*(USER\d+)/i)
        if (!match) {
            return res.status(400).json({ error: "No valid payment code found" })
        }

        const paymentCode = match[1].toUpperCase()
        console.log("Found payment code:", paymentCode)

        // Init Supabase admin client
        const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        )

        // Fetch user with the payment code
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, credits, full_name')
            .eq('payment_code', paymentCode)
            .single()

        if (profileError || !userProfile) {
            console.error("User not found:", profileError)
            return res.status(404).json({ error: "User not found" })
        }

        // Convert VND to credits
        const creditsToAdd = Math.floor(amount / 1000)
        if (creditsToAdd <= 0) {
            return res.status(200).json({ message: "Amount too small" })
        }

        const newBalance = (userProfile.credits || 0) + creditsToAdd

        // Update balance
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ credits: newBalance })
            .eq('id', userProfile.id)

        if (updateError) throw updateError

        // Log transaction
        await supabase
            .from('transactions')
            .insert({
                user_id: userProfile.id,
                amount_vnd: amount,
                credits_added: creditsToAdd,
                type: 'DEPOSIT',
                content,
                status: 'SUCCESS'
            })

        console.log(`Success: Added ${creditsToAdd} credits to ${userProfile.full_name}`)

        return res.status(200).json({ success: true, credits_added: creditsToAdd })

    } catch (error) {
        console.error("Webhook error:", error)
        return res.status(500).json({ error: error.message })
    }
})

// CORS preflight support
app.options('/', (req, res) => {
    res.set(corsHeaders)
    res.send("ok")
})

// Start server
const PORT = process.env.PORT || 8000
app.listen(PORT, () => console.log(`Webhook server running on port ${PORT}`))
