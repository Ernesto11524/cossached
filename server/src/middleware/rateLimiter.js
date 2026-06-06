import rateLimit from 'express-rate-limit'

// 10 attempts per 15 minutes per IP — blocks brute-force login attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 5 submissions per hour per IP
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many messages submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 20 chat messages per minute per IP
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many chat requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})
