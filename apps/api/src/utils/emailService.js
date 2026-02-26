import nodemailer from "nodemailer"
import { ApiError } from "./index.js"

// ✅ Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
}

// ✅ Send verification email
const sendVerificationEmail = async (email, fullName, token) => {
    try {
        const transporter = createTransporter()

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`

        const mailOptions = {
            from: `"QuizMitra" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: "Verify Your QuizMitra Account",
            html: `
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
            `,
        }

        const result = await transporter.sendMail(mailOptions)
        console.log("Verification email sent:", result.messageId)
        return result
    } catch (error) {
        console.error("Email sending error:", error)
        throw new ApiError(500, "Failed to send verification email")
    }
}

// ✅ Send password reset email
const sendPasswordResetEmail = async (email, fullName, token) => {
    try {
        const transporter = createTransporter()

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

        const mailOptions = {
            from: `"QuizMitra" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: "Reset Your QuizMitra Password",
            html: `
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
            `,
        }

        const result = await transporter.sendMail(mailOptions)

        console.log("Password reset email sent:", result.messageId)

        return result
    } catch (error) {
        console.error("Email sending error:", error)
        throw new ApiError(500, "Failed to send password reset email")
    }
}

// ✅ Send OTP verification email
const sendOTPEmail = async (email, fullName, otp) => {
    try {
        const transporter = createTransporter()

        const mailOptions = {
            from: `"QuizMitra" <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: "Your QuizMitra Verification Code",
            html: `
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
            `,
        }

        const result = await transporter.sendMail(mailOptions)
        console.log("OTP email sent successfully:", result.messageId)
        return result
    } catch (error) {
        console.error("Email sending error:", error)
        throw new ApiError(500, "Failed to send OTP email")
    }
}

export { sendVerificationEmail, sendPasswordResetEmail, sendOTPEmail }
