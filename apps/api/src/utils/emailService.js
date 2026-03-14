import nodemailer from "nodemailer"
import { ApiError } from "./index.js"

const DEFAULT_FROM_EMAIL =
    process.env.EMAIL_FROM ||
    process.env.ZOHO_USER ||
    process.env.SMTP_FROM_EMAIL

const getMailProvider = () => {
    const configuredProvider = process.env.EMAIL_PROVIDER?.toLowerCase()

    if (configuredProvider) {
        return configuredProvider
    }

    if (
        process.env.ZOHO_CLIENT_ID &&
        process.env.ZOHO_CLIENT_SECRET &&
        process.env.ZOHO_REFRESH_TOKEN &&
        process.env.ZOHO_ACCOUNT_ID
    ) {
        return "zoho"
    }

    return "smtp"
}

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false,
        },
    })
}

const sendWithSmtp = async ({ to, subject, html }) => {
    const transporter = createTransporter()

    try {
        await transporter.verify()
    } catch (error) {
        console.error("SMTP connection verification failed:", {
            message: error.message,
            code: error.code,
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
        })
        throw new ApiError(503, `SMTP connection failed: ${error.message}`)
    }

    try {
        const result = await transporter.sendMail({
            from: `"QuizMitra" <${DEFAULT_FROM_EMAIL}>`,
            to,
            subject,
            html,
        })

        console.log("SMTP email sent successfully:", result.messageId)
        return result
    } catch (error) {
        console.error("SMTP email sending error:", {
            message: error.message,
            code: error.code,
            command: error.command,
        })
        throw new ApiError(500, "Failed to send email")
    }
}

const getZohoAccessToken = async () => {
    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } =
        process.env

    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
        throw new ApiError(
            500,
            "ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN are required"
        )
    }

    const params = new URLSearchParams({
        refresh_token: ZOHO_REFRESH_TOKEN,
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
    })

    let response
    try {
        response = await fetch(
            `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`,
            {
                method: "POST",
            }
        )
    } catch (error) {
        throw new ApiError(503, `Zoho token request failed: ${error.message}`)
    }

    let data = null
    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok || !data?.access_token) {
        console.error("Zoho token API error:", {
            status: response.status,
            body: data,
        })
        throw new ApiError(
            502,
            data?.error || data?.message || "Failed to get Zoho access token"
        )
    }

    return data.access_token
}

const sendWithZoho = async ({ to, subject, html }) => {
    const { ZOHO_ACCOUNT_ID, ZOHO_USER } = process.env

    if (!ZOHO_ACCOUNT_ID || !ZOHO_USER) {
        throw new ApiError(500, "ZOHO_ACCOUNT_ID and ZOHO_USER are required")
    }

    if (!DEFAULT_FROM_EMAIL) {
        throw new ApiError(
            500,
            "EMAIL_FROM, ZOHO_USER, or SMTP_FROM_EMAIL is not configured"
        )
    }

    const accessToken = await getZohoAccessToken()

    let response
    try {
        response = await fetch(
            `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fromAddress: DEFAULT_FROM_EMAIL,
                    toAddress: to,
                    subject,
                    content: html,
                    mailFormat: "html",
                    askReceipt: "no",
                }),
            }
        )
    } catch (error) {
        throw new ApiError(503, `Zoho mail request failed: ${error.message}`)
    }

    let data = null
    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok || data?.status?.code !== 200) {
        console.error("Zoho mail API error:", {
            status: response.status,
            body: data,
        })
        throw new ApiError(
            502,
            data?.status?.description ||
                data?.message ||
                "Failed to send email via Zoho"
        )
    }

    console.log("Zoho email sent successfully")
    return data
}

const sendEmail = async ({ to, subject, html }) => {
    const provider = getMailProvider()

    if (!DEFAULT_FROM_EMAIL) {
        throw new ApiError(
            500,
            "EMAIL_FROM, ZOHO_USER, or SMTP_FROM_EMAIL is not configured"
        )
    }

    if (provider === "zoho") {
        return sendWithZoho({ to, subject, html })
    }

    if (provider === "smtp") {
        return sendWithSmtp({ to, subject, html })
    }

    throw new ApiError(500, `Unsupported email provider: ${provider}`)
}

const sendVerificationEmail = async (email, fullName, token) => {
    try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`

        const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Verify Your Email</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9f9f9; }
                        .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to QuizMitra!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${fullName}!</h2>
                            <p>Thank you for registering with QuizMitra. To complete your registration, please verify your email address by clicking the button below:</p>
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                            <p>Or copy and paste this link into your browser:</p>
                            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
                            <p><strong>This link will expire in 24 hours.</strong></p>
                            <p>If you didn't create an account with QuizMitra, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2025 QuizMitra. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `

        return await sendEmail({
            to: email,
            subject: "Verify Your QuizMitra Account",
            html,
        })
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("Email sending error:", error)
        throw new ApiError(500, "Failed to send verification email")
    }
}

const sendPasswordResetEmail = async (email, fullName, token) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

        const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reset Your Password</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background: #f9f9f9; }
                        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${fullName}!</h2>
                            <p>We received a request to reset your QuizMitra password. Click the button below to reset it:</p>
                            <a href="${resetUrl}" class="button">Reset Password</a>
                            <p>Or copy and paste this link into your browser:</p>
                            <p><a href="${resetUrl}">${resetUrl}</a></p>
                            <p><strong>This link will expire in 1 hour.</strong></p>
                            <p>If you didn't request a password reset, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2025 QuizMitra. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `

        return await sendEmail({
            to: email,
            subject: "Reset Your QuizMitra Password",
            html,
        })
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("Email sending error:", error)
        throw new ApiError(500, "Failed to send password reset email")
    }
}

const sendOTPEmail = async (email, fullName, otp) => {
    try {
        const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Your Verification Code</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { padding: 30px 20px; background: #f9f9f9; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none; }
                        .otp-box { background: #e0e7ff; color: #4338ca; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 15px 30px; border-radius: 8px; margin: 25px 0; display: inline-block; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>Email Verification</h2>
                        </div>
                        <div class="content">
                            <h3>Hello ${fullName}!</h3>
                            <p>To complete your registration at QuizMitra, please use the following 6-digit Verification Code:</p>
                            
                            <div class="otp-box">${otp}</div>
                            
                            <p><strong>This code will expire in 10 minutes.</strong></p>
                            <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} QuizMitra. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `

        return await sendEmail({
            to: email,
            subject: "Your QuizMitra Verification Code",
            html,
        })
    } catch (error) {
        if (error instanceof ApiError) throw error
        console.error("OTP email sending error:", error)
        throw new ApiError(500, "Failed to send OTP email")
    }
}

export { sendVerificationEmail, sendPasswordResetEmail, sendOTPEmail }
